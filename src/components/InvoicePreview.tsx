"use client";

import { useEffect, useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { formatSwissNumber } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { useLanguage } from "@/components/language-context";

type Contact = {
  id: string;
  company?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  street: string;
  street2?: string;
  zipCode: string;
  place: string;
  country: string;
  currency?: string;
  iban?: string;
};

type OrgProfile = {
  firstName?: string;
  lastName?: string;
  company?: string;
  street: string;
  street2?: string;
  zipCode: string;
  place: string;
  country: string;
  phone?: string;
  mobile?: string;
  iban: string;
  currency: string;
  defaultVat?: number;
  vatNumber?: string;
};

type InvoiceItem = {
  description: string;
  amountInput: string;
  expenseId?: string;
};

export function InvoicePreview({ 
  contacts, 
  defaultVat = 0,
  plan = "FREE"
}: { 
  contacts: { id: string; name: string }[]; 
  defaultVat?: number;
  plan?: string;
}) {
  const { show } = useToast();
  const { t, lang } = useLanguage();
  const [loading, startTransition] = useTransition();
  
  // Organization profile
  const [orgProfile, setOrgProfile] = useState<OrgProfile | null>(null);
  const [orgError, setOrgError] = useState<string | null>(null);
  
  // Customer selection
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<{ id: string; label: string }[]>([]);
  const [pickedId, setPickedId] = useState<string | null>(null);
  
  // New customer form
  const [newCustomer, setNewCustomer] = useState({
    company: "",
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    street2: "",
    zipCode: "",
    place: "",
    country: "CH",
    currency: "CHF",
    iban: "",
  });

  // Invoice details
  const [currency, setCurrency] = useState("CHF");
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [dueDate, setDueDate] = useState<string>("");
  const [dueMode, setDueMode] = useState<"10"|"15"|"30"|"manual">("30");
  const [taxPercent, setTaxPercent] = useState<number>(defaultVat);
  const [language, setLanguage] = useState<"DE"|"FR"|"IT"|"RM"|"EN">("EN");
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", amountInput: "" }
  ]);
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // Load organization profile
  useEffect(() => {
    async function loadOrgProfile() {
      try {
        const res = await fetch('/api/org');
        if (res.ok) {
          const data = await res.json();
          setOrgProfile(data.org);
          // Set VAT rate from profile if available and not manually changed
          if (data.org?.defaultVat !== undefined) {
            setTaxPercent(data.org.defaultVat);
          }
        } else {
          console.error('Failed to load org profile, status:', res.status);
          setOrgError(t("preview.failedOrg"));
        }
      } catch (error) {
        console.error('Failed to load org profile:', error);
        setOrgError(t("preview.failedOrg"));
      }
    }
    loadOrgProfile();
  }, []);

  // Generate invoice number
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setInvoiceNumber(`INV-${year}${month}${day}-${random}`);
  }, []);

  // Customer search
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      const q = customerQuery.trim();
      if (!q) { setSuggestions([]); return; }
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) {
          const data = await res.json();
          const customers = Array.isArray(data.items)
            ? data.items.filter((it: any) => it.type === 'customer').map((it: any) => ({ id: it.id, label: it.label }))
            : [];
          setSuggestions(customers);
        }
      } catch {}
    }, 200);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [customerQuery]);

  // Load selected contact details when an existing customer is chosen
  useEffect(() => {
    if (pickedId) return;
    if (customerMode === "existing" && customerQuery.trim()) {
      // Try to resolve an ID from current suggestions first (exact label match)
      const sug = suggestions.find(s => s.label === customerQuery.trim());
      let contactIdToLoad: string | null = sug?.id || null;

      // Fallback: resolve by exact name match from initial contactOptions
      if (!contactIdToLoad) {
        const found = contacts.find(c => c.name.trim().toLowerCase() === customerQuery.trim().toLowerCase());
        if (found) contactIdToLoad = found.id;
      }

      if (contactIdToLoad) {
        (async () => {
          try {
            const res = await fetch(`/api/contacts/${contactIdToLoad}`);
            if (res.ok) {
              const data = await res.json();
              setSelectedContact(data.contact);
            } else {
              setSelectedContact(null);
            }
          } catch (error) {
            console.error('Failed to load contact:', error);
            setSelectedContact(null);
          }
        })();
      } else {
        setSelectedContact(null);
      }
    } else {
      setSelectedContact(null);
    }
  }, [customerMode, customerQuery, contacts, suggestions, pickedId]);

  // Auto-compute due date
  function recomputeDue(dMode: typeof dueMode, issDate: string) {
    if (dMode === "manual" || !issDate) return;
    const d = new Date(issDate);
    const days = parseInt(dMode, 10);
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().slice(0,10));
  }

  useEffect(() => {
    recomputeDue(dueMode, issueDate);
  }, [dueMode, issueDate]);

  // Item management
  function updateItem(i: number, field: string, value: any) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }

  function addItem() {
    setItems(prev => [...prev, { description: "", amountInput: "" }]);
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }

  async function selectCustomer(id: string, label: string) {
    setCustomerQuery(label);
    setCustomerMode("existing");
    setPickedId(id);
    setFormError(null);
    try {
      const res = await fetch(`/api/contacts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedContact(data.contact);
      }
    } catch (error) {
      console.error('Failed to load contact:', error);
    }
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const amount = parseFloat(item.amountInput.replace(',', '.')) || 0;
    return sum + amount;
  }, 0);

  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + taxAmount;

  // Form validation and submission
  async function handleSubmit(status: 'DRAFT' | 'SENT') {
    setFormError(null);
    if (!orgProfile) {
      show({ title: t("preview.orgRequired"), variant: "error" });
      return;
    }

    let contactId = selectedContact?.id;
    
    if (customerMode === "new") {
      // Create new customer
      const resC = await fetch("/app/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      if (!resC.ok) {
        show({ title: t("invoice.failedAddCustomer"), variant: "error" });
        return;
      }
      const data = await resC.json();
      contactId = data.contact.id;
    }

    if (!contactId) {
      setFormError(t("preview.selectOrCreateCustomer"));
      show({ title: t("preview.selectOrCreateCustomer"), variant: "error" });
      document.getElementById("customer-search")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const apiItems = items.map(it => {
      const amt = parseFloat((it.amountInput || "").replace(',', '.'));
      return { 
        description: it.description, 
        quantity: 1, 
        unit: "pc", 
        unitPrice: Number.isFinite(amt) ? Math.round(amt * 100) / 100 : 0, 
        currency, 
        expenseId: it.expenseId 
      };
    });

    startTransition(async () => {
      const res = await fetch("/app/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          contactId, 
          currency, 
          items: apiItems, 
          reference, 
          message, 
          issueDate, 
          dueDate: dueDate || undefined, 
          taxPercent,
          status,
          outputSize: 'A4_PORTRAIT_SHEET'
        })
      });
      
      if (res.ok) {
        await res.json();
        if (status === 'DRAFT') {
          show({ title: t("preview.draftSaved"), variant: "success" });
          window.setTimeout(() => { window.location.href = `/contacts/${contactId}`; }, 600);
        } else {
          window.location.href = `/contacts/${contactId}`;
        }
      } else {
        show({ title: status === 'DRAFT' ? t("preview.failedSaveDraft") : t("preview.failedCreateInvoice"), variant: "error" });
      }
    });
  }

  if (!orgProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          {orgError ? (
            <div className="space-y-3">
              <p className="text-rose-600">{orgError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
              >
                {t("preview.reload")}
              </button>
            </div>
          ) : (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t("preview.loadingOrg")}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const locale = lang === "de" ? "de-CH" : lang === "fr" ? "fr-CH" : lang === "it" ? "it-CH" : "en-GB";
    return new Date(dateStr).toLocaleDateString(locale);
  };

  const getCustomerDisplay = () => {
    if (customerMode === "existing" && selectedContact) {
      return selectedContact;
    } else if (customerMode === "new") {
      return {
        company: newCustomer.company,
        firstName: newCustomer.firstName,
        lastName: newCustomer.lastName,
        email: newCustomer.email,
        street: newCustomer.street,
        street2: newCustomer.street2,
        zipCode: newCustomer.zipCode,
        place: newCustomer.place,
        country: newCustomer.country,
      };
    }
    return null;
  };

  const customer = getCustomerDisplay();

  return (
    <div className="max-w-4xl mx-auto">

      {/* Invoice Preview */}
      <div className="bg-white shadow-lg mx-auto w-full max-w-[210mm] p-4 sm:min-h-[297mm] sm:p-[20mm]">
        {/* Header with Sender and Invoice Info */}
        <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:justify-between">
          {/* Sender (Your Company) - Left */}
          <div className="w-full sm:w-1/3">
            <h1 className="text-xl font-bold text-gray-900 mb-3">
              {orgProfile.company || `${orgProfile.firstName || ''} ${orgProfile.lastName || ''}`.trim()}
            </h1>
            <div className="text-xs text-gray-600 space-y-1">
              <div>{orgProfile.street}</div>
              {orgProfile.street2 && <div>{orgProfile.street2}</div>}
              <div>{orgProfile.zipCode} {orgProfile.place}</div>
              {orgProfile.country !== 'CH' && <div>{orgProfile.country}</div>}
            </div>
          </div>

          {/* Invoice Number and Date - Right */}
          <div className="w-full sm:w-1/3 text-left sm:text-right">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{t("preview.invoice")}</h2>
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>{t("preview.no")}</strong> {invoiceNumber}</div>
              <div><strong>{t("preview.date")}</strong> {formatDate(issueDate)}</div>
              <div><strong>{t("preview.due")}</strong> {formatDate(dueDate)}</div>
            </div>
          </div>
        </div>

        {/* Recipient - Positioned on RIGHT side to match PDF */}
        <div className="mb-8 flex justify-start sm:justify-end">
          <div className="w-full sm:w-1/2">
            <h3 className="text-sm font-medium text-gray-500 mb-3">{t("preview.billTo")}</h3>
            
            {/* Customer Search/Select */}
            <div className="mb-3 relative">
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="customer-search"
                placeholder={t("preview.searchCustomer")}
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setCustomerMode("existing");
                  setPickedId(null);
                }}
                suppressHydrationWarning
              />
              {customerQuery.trim() && !selectedContact && suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCustomer(s.id, s.label)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Quick Add {t("preview.newCustomer")} Button */}
            {!customer && customerMode === "existing" && (
              <button
                onClick={() => setCustomerMode("new")}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-3 flex items-center gap-1"
              >
                <span>+</span> {t("invoice.addNewCustomer")}
              </button>
            )}
            
            {/* Inline {t("preview.newCustomer")} Form */}
            {customerMode === "new" && (
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 mb-3 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{t("preview.newCustomer")}</h4>
                  <button
                    onClick={() => {
                      setCustomerMode("existing");
                      setNewCustomer({
                        company: "",
                        firstName: "",
                        lastName: "",
                        email: "",
                        street: "",
                        street2: "",
                        zipCode: "",
                        place: "",
                        country: "CH",
                        currency: "CHF",
                        iban: "",
                      });
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    ✕ {t("common.cancel")}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm"
                    placeholder={t("common.companyOptional")}
                    value={newCustomer.company}
                    onChange={e => setNewCustomer({...newCustomer, company: e.target.value})}
                    suppressHydrationWarning
                  />
                  <input
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    placeholder={t("preview.firstNameLabel")}
                    value={newCustomer.firstName}
                    onChange={e => setNewCustomer({...newCustomer, firstName: e.target.value})}
                    suppressHydrationWarning
                  />
                  <input
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    placeholder={t("preview.lastNameLabel")}
                    value={newCustomer.lastName}
                    onChange={e => setNewCustomer({...newCustomer, lastName: e.target.value})}
                    suppressHydrationWarning
                  />
                  <input
                    className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm"
                    placeholder={t("invoice.emailLabel")}
                    type="email"
                    value={newCustomer.email}
                    onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                    suppressHydrationWarning
                  />
                  <input
                    className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm"
                    placeholder={t("preview.streetAddressLabel")}
                    value={newCustomer.street}
                    onChange={e => setNewCustomer({...newCustomer, street: e.target.value})}
                    suppressHydrationWarning
                  />
                  <input
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    placeholder={t("invoice.zipLabel")}
                    value={newCustomer.zipCode}
                    onChange={e => {
                      let value = e.target.value;
                      if (newCustomer.country === 'CH') {
                        value = value.replace(/\D/g, '').slice(0, 4);
                      }
                      setNewCustomer({...newCustomer, zipCode: value});
                    }}
                    maxLength={newCustomer.country === 'CH' ? 4 : 10}
                    suppressHydrationWarning
                  />
                  <input
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    placeholder={t("preview.cityLabel")}
                    value={newCustomer.place}
                    onChange={e => setNewCustomer({...newCustomer, place: e.target.value})}
                    suppressHydrationWarning
                  />
                  <select
                    className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={newCustomer.country}
                    onChange={e => setNewCustomer({...newCustomer, country: e.target.value, zipCode: ''})}
                  >
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            
            {/* Display Selected/{t("preview.newCustomer")} Address */}
            {customer ? (
              <div className="border-2 border-blue-500 bg-white rounded-lg p-4 shadow-sm">
                {/* Header with change button */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">{t("preview.selectedCustomer")}</div>
                  </div>
                  <button
                    onClick={() => {
                      setCustomerQuery("");
                      setSelectedContact(null);
                      setCustomerMode("existing");
                      setPickedId(null);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    ✕ {t("preview.change")}
                  </button>
                </div>
                
                {/* Full Address Display */}
                <div className="space-y-2">
                  {/* Recipient name (company or person - required by Swiss Post) */}
                  {customer.company ? (
                    <div className="font-semibold text-gray-900 text-base">{customer.company}</div>
                  ) : (
                    <div className="font-semibold text-gray-900 text-base">
                      {customer.firstName && customer.lastName ? 
                        `${customer.firstName} ${customer.lastName}` : 
                        (customer.firstName || customer.lastName || t("preview.unknownRecipient"))
                      }
                    </div>
                  )}
                  
                  {/* Additional recipient info if both company and person name exist */}
                  {customer.company && (customer.firstName || customer.lastName) && (
                    <div className="text-gray-700">{customer.firstName} {customer.lastName}</div>
                  )}
                  
                  {/* Divider */}
                  <div className="border-t border-gray-200 my-2"></div>
                  
                  {/* Address Lines */}
                  <div className="text-sm text-gray-700 space-y-1">
                    {/* Street and house number on one line */}
                    <div>{customer.street}</div>
                    
                    {/* Street2 if exists */}
                    {customer.street2 && <div>{customer.street2}</div>}
                    
                    {/* 4-digit postcode and city on one line, no comma, space-separated */}
                    <div className="font-medium">{customer.zipCode} {customer.place}</div>
                    
                    {/* Country only for non-CH addresses (Swiss Post requirement) */}
                    {customer.country && customer.country !== 'CH' && customer.country !== 'Switzerland' && (
                      <div>{customer.country}</div>
                    )}
                  </div>
                  
                  {/* Contact Details */}
                  {(customer.email || (customer as any).iban) && (
                    <>
                      <div className="border-t border-gray-200 my-2"></div>
                      <div className="text-xs text-gray-600 space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t("common.email")}:</span>
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {(customer as any).iban && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t("preview.ibanLabel")}</span>
                            <span className="font-mono text-xs">{(customer as any).iban}</span>
                          </div>
                        )}
                        {(customer as any).currency && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t("preview.currencyLabel")}</span>
                            <span>{(customer as any).currency}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : customerMode === "new" ? (
              <div className="text-sm italic text-gray-500 border border-dashed border-gray-300 rounded p-3">
                {t("preview.fillDetails")}
              </div>
            ) : (
              <div className="text-sm italic text-gray-400 border border-dashed border-gray-300 rounded p-3">
                {t("preview.searchOrAdd")}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-12">
          <h3 className="text-sm font-medium text-gray-500 mb-4">{t("preview.lineItems")}</h3>
          
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("common.description")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("common.amount")} ({currency})
                  </th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <input
                        className="w-full border-none outline-none bg-transparent"
                        placeholder={t("preview.describeService")}
                        value={item.description}
                        onChange={e => updateItem(i, "description", e.target.value)}
                        suppressHydrationWarning
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        className="w-full text-right border-none outline-none bg-transparent"
                        placeholder="0.00"
                        value={item.amountInput}
                        onChange={e => updateItem(i, "amountInput", e.target.value)}
                        suppressHydrationWarning
                      />
                    </td>
                    <td className="px-4 py-3">
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(i)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addItem}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            + {t("invoice.addLineItem")}
          </button>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-12">
          <div className="w-full sm:w-1/2">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t("preview.subtotal")}</span>
                <span>{formatSwissNumber(subtotal)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("preview.vat")} ({taxPercent}%):</span>
                <span>{formatSwissNumber(taxAmount)} {currency}</span>
              </div>
              <div className="border-t pt-2 font-bold flex justify-between">
                <span>{t("preview.total")}</span>
                <span>{formatSwissNumber(total)} {currency}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Settings */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block font-medium mb-1">{t("preview.paymentTerms")}</label>
              <select
                value={dueMode}
                onChange={e => {
                  setDueMode(e.target.value as any);
                  recomputeDue(e.target.value as any, issueDate);
                }}
                className="w-full border border-gray-300 rounded px-2 py-1"
              >
                <option value="10">{t("preview.days10")}</option>
                <option value="15">{t("preview.days15")}</option>
                <option value="30">{t("preview.days30")}</option>
                <option value="manual">{t("preview.selectDate")}</option>
              </select>
              {dueMode === "manual" && (
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded px-2 py-1"
                  suppressHydrationWarning
                />
              )}
            </div>
            
            <div>
              <label className="block font-medium mb-1">{t("preview.vatRatePct")}</label>
              <select
                value={String(taxPercent)}
                onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded px-2 py-1"
              >
                {!["0","2.6","3.8","7.7","8.1"].includes(String(taxPercent)) && (
                  <option value={String(taxPercent)}>{taxPercent}%</option>
                )}
                <option value="0">0%</option>
                <option value="2.6">2.6%</option>
                <option value="3.8">3.8%</option>
                <option value="7.7">7.7%</option>
                <option value="8.1">8.1%</option>
              </select>
            </div>
            
            <div>
              <label className="block font-medium mb-1">{t("common.currency")}</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1"
              >
                <option value="CHF">CHF</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block font-medium mb-1">{t("preview.message")}</label>
              <input
                placeholder={t("preview.messageForCustomer2")}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1"
                suppressHydrationWarning
              />
            </div>
            
            <div>
              <label className="block font-medium mb-1">{t("preview.reference")}</label>
              <input
                placeholder={t("preview.invoiceReference2")}
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1"
                suppressHydrationWarning
              />
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-8">
            <div className="text-sm text-gray-600">
              <strong>{t("preview.messageLabel")}</strong> {message}
            </div>
          </div>
        )}
        
        {/* Watermark (free/beta only — PRO is watermark-free) */}
        {plan !== "PRO" && (
          <div className="mt-12 mb-6 text-center">
            <p className="text-sm text-gray-500">
              {t("preview.createdWithLove")}{' '}
              <a 
                href="https://facturio.ch" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 font-medium text-base hover:text-blue-700"
              >
                facturio.ch
              </a>
            </p>
          </div>
        )}
        
        {/* Swiss QR-Bill Preview */}
        <div className="border-t-2 border-black mt-8 overflow-x-auto">
          <div className="flex border-b-2 border-dashed border-gray-400 min-w-[210mm]" style={{ minHeight: '105mm' }}>
            {/* Receipt Section (Left) */}
            <div className="w-[62mm] border-r border-black p-3" style={{ fontSize: '8pt', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <div className="mb-3">
                <div className="font-bold text-[11pt] mb-2">{t("preview.receipt")}</div>
              </div>
              
              <div className="mb-3">
                <div className="font-bold mb-1">{t("preview.accountPayable")}</div>
                <div className="leading-tight">
                  {orgProfile?.iban ? (
                    <>
                      <div>{orgProfile.iban}</div>
                      <div className="mt-1">
                        {orgProfile.company || `${orgProfile.firstName || ''} ${orgProfile.lastName || ''}`.trim()}
                      </div>
                      <div>{orgProfile.street}</div>
                      {orgProfile.street2 && <div>{orgProfile.street2}</div>}
                      <div>{orgProfile.zipCode} {orgProfile.place}</div>
                    </>
                  ) : (
                    <div className="text-gray-400 italic">{t("preview.ibanNotSet")}</div>
                  )}
                </div>
              </div>
              
              <div className="mb-3">
                <div className="font-bold mb-1">{t("preview.payableBy")}</div>
                <div className="leading-tight">
                  {customer ? (
                    <>
                      <div>{customer.company || `${customer.firstName} ${customer.lastName}`}</div>
                      <div>{customer.street}</div>
                      {customer.street2 && <div>{customer.street2}</div>}
                      <div>{customer.zipCode} {customer.place}</div>
                    </>
                  ) : (
                    <div className="text-gray-400 italic">{t("preview.customerNotSelected")}</div>
                  )}
                </div>
              </div>
              
              <div className="mb-3">
                <div className="font-bold mb-1">{t("common.currency")}</div>
                <div>{currency}</div>
              </div>
              
              <div className="mb-3">
                <div className="font-bold mb-1">{t("common.amount")}</div>
                <div className="text-[10pt] font-bold">
                  {total > 0 ? formatSwissNumber(total) : '0.00'}
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-black">
                <div className="text-[7pt] text-right">{t("preview.acceptancePoint")}</div>
              </div>
            </div>
            
            {/* Payment Part Section (Right) */}
            <div className="flex-1 p-3" style={{ fontSize: '10pt', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <div className="mb-4">
                <div className="font-bold text-[11pt] mb-3">{t("preview.paymentPart")}</div>
              </div>
              
              <div className="flex gap-4">
                {/* QR Code */}
                <div className="flex-shrink-0">
                  <div className="w-[46mm] h-[46mm] bg-white border border-gray-300 flex items-center justify-center relative">
                    {customer && orgProfile && total > 0 ? (
                      <div className="relative w-full h-full p-2">
                        {/* Realistic QR Code Pattern */}
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          {/* QR Code pattern (simplified) */}
                          <rect fill="black" x="0" y="0" width="7" height="7" />
                          <rect fill="white" x="1" y="1" width="5" height="5" />
                          <rect fill="black" x="2" y="2" width="3" height="3" />
                          <rect fill="black" x="93" y="0" width="7" height="7" />
                          <rect fill="white" x="94" y="1" width="5" height="5" />
                          <rect fill="black" x="95" y="2" width="3" height="3" />
                          <rect fill="black" x="0" y="93" width="7" height="7" />
                          <rect fill="white" x="1" y="94" width="5" height="5" />
                          <rect fill="black" x="2" y="95" width="3" height="3" />
                          {/* Random QR pattern */}
                          {Array.from({length: 80}, (_, i) => {
                            const x = ((i * 7) % 90) + 5;
                            const y = Math.floor((i * 7) / 90) * 5 + 10;
                            return Math.random() > 0.5 ? <rect key={i} fill="black" x={x} y={y} width="3" height="3" /> : null;
                          })}
                          {/* Swiss Cross in center */}
                          <rect fill="white" x="42" y="42" width="16" height="16" />
                          <rect fill="black" x="47" y="44" width="6" height="12" />
                          <rect fill="black" x="44" y="47" width="12" height="6" />
                        </svg>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <div className="text-[8pt] text-gray-400">{t("preview.completeDetails")}<br/>{t("preview.toPreview")}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Payment Details */}
                <div className="flex-1">
                  <div className="mb-3">
                    <div className="font-bold mb-1">{t("common.currency")}</div>
                    <div>{currency}</div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="font-bold mb-1">{t("common.amount")}</div>
                    <div className="text-[12pt] font-bold">
                      {total > 0 ? formatSwissNumber(total) : '0.00'}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="font-bold mb-1">{t("preview.accountPayable")}</div>
                    <div className="leading-tight text-[9pt]">
                      {orgProfile?.iban ? (
                        <>
                          <div>{orgProfile.iban}</div>
                          <div className="mt-1">
                            {orgProfile.company || `${orgProfile.firstName || ''} ${orgProfile.lastName || ''}`.trim()}
                          </div>
                          <div>{orgProfile.street}</div>
                          {orgProfile.street2 && <div>{orgProfile.street2}</div>}
                          <div>{orgProfile.zipCode} {orgProfile.place}</div>
                        </>
                      ) : (
                        <div className="text-gray-400 italic">{t("preview.ibanNotSet")}</div>
                      )}
                    </div>
                  </div>
                  
                  {reference && (
                    <div className="mb-3">
                      <div className="font-bold mb-1">{t("preview.reference")}</div>
                      <div className="font-mono text-[8pt] break-all">{reference}</div>
                    </div>
                  )}
                  
                  {message && (
                    <div className="mb-3">
                      <div className="font-bold mb-1">{t("preview.additionalInfo")}</div>
                      <div className="text-[9pt]">{message}</div>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <div className="font-bold mb-1">{t("preview.payableBy")}</div>
                    <div className="leading-tight text-[9pt]">
                      {customer ? (
                        <>
                          <div>{customer.company || `${customer.firstName} ${customer.lastName}`}</div>
                          <div>{customer.street}</div>
                          {customer.street2 && <div>{customer.street2}</div>}
                          <div>{customer.zipCode} {customer.place}</div>
                        </>
                      ) : (
                        <div className="text-gray-400 italic">{t("preview.customerNotSelected")}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-b text-xs text-blue-700">
            <strong>ℹ️ {t("preview.previewLabel")}</strong> {t("preview.qrNote")}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {formError && (
        <div className="mt-8 text-center text-sm font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
          {formError}
        </div>
      )}
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          onClick={() => handleSubmit('DRAFT')}
          disabled={loading}
          className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t("common.saving") : t("preview.saveDraft")}
        </button>
        <button
          onClick={() => handleSubmit('SENT')}
          disabled={loading}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
        >
          {loading ? t("preview.generating") : t("preview.generateInvoice")}
        </button>
      </div>
      
      <div className="mt-4 text-center text-xs text-gray-500">
        <p><strong>{t("preview.saveDraft")}:</strong> {t("preview.saveDraftHint")}</p>
        <p><strong>{t("preview.generateInvoice")}:</strong> {t("preview.generateHint")}</p>
      </div>
    </div>
  );
}