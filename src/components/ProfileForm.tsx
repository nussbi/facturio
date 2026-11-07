"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { COUNTRIES } from "@/lib/countries";
import { useLanguage } from "@/components/language-context";

const INVOICE_AFFECTING_FIELDS = ["company", "firstName", "lastName", "street", "street2", "zipCode", "place", "country", "iban", "currency", "defaultVat", "vatNumber"];
function invoiceFieldsChanged(prev: any, next: any): boolean {
  return INVOICE_AFFECTING_FIELDS.some((k) => (prev?.[k] ?? "") !== (next[k] ?? ""));
}

export default function ProfileForm() {
  const { t } = useLanguage();
  const [pending, start] = useTransition();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    street: "",
    street2: "",
    zipCode: "",
    place: "",
    country: "CH",
    phone: "",
    mobile: "",
    iban: "",
    currency: "CHF",
    defaultVat: "",
    vatNumber: "",
    emailSubject: t("profile.emailSubjectDefault"),
    emailBody: t("profile.emailBodyDefault"),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedSections, setSavedSections] = useState<Record<string, boolean>>({
    personal: false,
    address: false,
    bank: false,
    vat: false,
    email: false,
  });
  const [editingSections, setEditingSections] = useState<Record<string, boolean>>({
    personal: true,
    address: true,
    bank: true,
    vat: true,
    email: true,
  });
  const [savingSections, setSavingSections] = useState<Record<string, boolean>>({
    personal: false,
    address: false,
    bank: false,
    vat: false,
    email: false,
  });
  const [sectionStatus, setSectionStatus] = useState<Record<string, { type: 'success' | 'error'; message: string } | null>>({
    personal: null,
    address: null,
    bank: null,
    vat: null,
    email: null,
  });
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateResult, setRegenerateResult] = useState<string | null>(null);
  const regeneratePromptedRef = useRef(false);

  // Load existing profile from API to prefill form
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/org');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        const org = data?.org;
        if (org && !cancelled) {
          setForm({
            firstName: org.firstName || "",
            lastName: org.lastName || "",
            company: org.company || "",
            street: org.street || "",
            street2: org.street2 || "",
            zipCode: org.zipCode || "",
            place: org.place || "",
            country: org.country || "CH",
            phone: org.phone || "",
            mobile: org.mobile || "",
            iban: org.iban || "",
            currency: org.currency || "CHF",
            defaultVat: org.defaultVat != null ? String(org.defaultVat) : "",
            vatNumber: org.vatNumber || "",
            emailSubject: org.emailSubject || t("profile.emailSubjectDefault"),
            emailBody: org.emailBody || t("profile.emailBodyDefault"),
          });
          // Determine which sections have been saved
          const saved = {
            personal: Boolean((org.firstName || "").trim() && (org.lastName || "").trim()),
            address: Boolean((org.street || "").trim() && (org.zipCode || "").trim() && (org.place || "").trim()),
            bank: Boolean((org.iban || "").trim()),
            vat: Boolean(org.defaultVat != null), // VAT is saved if any defaultVat value exists (including 0)
            email: Boolean((org.emailSubject && org.emailSubject.trim()) || (org.emailBody && org.emailBody.trim())),
          };
          setSavedSections(saved);
          // Keep saved sections greyed out (disabled) until user clicks Edit
          setEditingSections({
            personal: !saved.personal,
            address: !saved.address,
            bank: !saved.bank,
            vat: !saved.vat,
            email: !saved.email,
          });
        }
      } catch (e) {
        // ignore and keep defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // --- Auto-save (debounced) ---
  const formRef = useRef(form);
  formRef.current = form;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  // Capture the loaded form as the "saved" baseline once loading finishes
  useEffect(() => {
    if (!loading) {
      lastSavedRef.current = JSON.stringify(form);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function persistSilently() {
    const f = formRef.current;
    const prev = lastSavedRef.current ? JSON.parse(lastSavedRef.current) : null;
    const invoiceChanged = prev ? invoiceFieldsChanged(prev, f) : false;
    const payload: any = {
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      company: f.company.trim(),
      street: f.street.trim(),
      street2: f.street2.trim(),
      zipCode: f.zipCode.trim(),
      place: f.place.trim(),
      country: f.country,
      phone: f.phone.trim(),
      mobile: f.mobile.trim(),
      iban: f.iban.trim(),
      currency: f.currency,
      defaultVat: f.defaultVat && f.defaultVat.trim() !== "" ? parseFloat(f.defaultVat) : null,
      vatNumber: f.vatNumber.trim(),
      emailSubject: f.emailSubject?.trim() || undefined,
      emailBody: f.emailBody?.trim() || undefined,
    };
    try {
      const res = await fetch('/api/org', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        lastSavedRef.current = JSON.stringify(f);
        setSavedSections({ personal: true, address: true, bank: true, vat: Boolean(payload.vatNumber), email: Boolean(payload.emailSubject || payload.emailBody) });
        setSectionStatus({ personal: null, address: null, bank: null, vat: null, email: null });
        if (invoiceChanged && !regeneratePromptedRef.current) {
          regeneratePromptedRef.current = true;
          setShowRegenerate(true);
        }
      } else {
        setSectionStatus({
          personal: { type: 'error', message: t("profile.failedSave") },
          address: null,
          bank: null,
          vat: null,
          email: null,
        });
        setTimeout(() => {
          setSectionStatus({ personal: null, address: null, bank: null, vat: null, email: null });
        }, 4000);
      }
    } catch {
      setSectionStatus({
        personal: { type: 'error', message: t("profile.failedSave") },
        address: null,
        bank: null,
        vat: null,
        email: null,
      });
      setTimeout(() => {
        setSectionStatus({ personal: null, address: null, bank: null, vat: null, email: null });
      }, 4000);
    }
  }

  // Debounced auto-save when the form changes after load
  useEffect(() => {
    if (loading) return;
    const snapshot = JSON.stringify(form);
    if (snapshot === lastSavedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persistSilently();
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // Country-specific VAT rates
  const getVatOptions = () => {
    switch (form.country) {
      case "CH": // Switzerland
        return [
          { value: "", label: t("profile.selectVat") },
          { value: "0", label: t("profile.notSubject") },
          { value: "2.6", label: `2.6% (${t("profile.reducedRate")})` },
          { value: "3.8", label: `3.8% (${t("profile.accommodation")})` },
          { value: "8.1", label: `8.1% (${t("profile.standardRate")})` },
        ];
      case "DE": // Germany
        return [
          { value: "", label: t("profile.selectVat") },
          { value: "0", label: t("profile.notSubject") },
          { value: "7", label: `7% (${t("profile.reducedRate")})` },
          { value: "19", label: `19% (${t("profile.standardRate")})` },
        ];
      case "AT": // Austria
        return [
          { value: "", label: t("profile.selectVat") },
          { value: "0", label: t("profile.notSubject") },
          { value: "10", label: `10% (${t("profile.reducedRate")})` },
          { value: "13", label: `13% (${t("profile.intermediateRate")})` },
          { value: "20", label: `20% (${t("profile.standardRate")})` },
        ];
      default: // Liechtenstein and others
        return [
          { value: "", label: t("profile.selectVat") },
          { value: "0", label: t("profile.notSubject") },
          { value: "8.1", label: `8.1% (${t("profile.standardRate")})` },
        ];
    }
  };

  // ZIP validation and formatting based on country
  const handleZipChange = (value: string) => {
    // CH/LI/AT/DE use numeric ZIPs; all other countries allow alphanumeric (e.g. UK, CA)
    const numeric = form.country === "CH" || form.country === "LI" || form.country === "AT" || form.country === "DE";
    let maxLength = 10; // Default (international)
    if (form.country === "CH" || form.country === "LI" || form.country === "AT") {
      maxLength = 4;
    } else if (form.country === "DE") {
      maxLength = 5;
    }
    
    const val = numeric
      ? value.replace(/\D/g, '').slice(0, maxLength)
      : value.replace(/[^A-Za-z0-9 -]/g, '').toUpperCase().slice(0, maxLength);
    setForm({...form, zipCode: val});
  };

  const getZipPlaceholder = () => {
    if (form.country === "CH" || form.country === "LI" || form.country === "AT") {
      return t("profile.zip4");
    } else if (form.country === "DE") {
      return t("profile.zip5");
    }
    return t("profile.postalCode");
  };

  const getZipMaxLength = () => {
    if (form.country === "CH" || form.country === "LI" || form.country === "AT") return 4;
    if (form.country === "DE") return 5;
    return 10;
  };

  function validateSection(section: string) {
    const e: Record<string, string> = {};
    
    if (section === 'personal') {
      if (!form.firstName) e.firstName = t("profile.firstNameRequired");
      if (!form.lastName) e.lastName = t("profile.lastNameRequired");
    }
    
    if (section === 'address') {
      if (!form.street) e.street = t("profile.streetRequired");
      if (!form.zipCode) e.zipCode = t("profile.zipRequired");
      else if ((form.country === "CH" || form.country === "AT") && !/^\d{4}$/.test(form.zipCode)) 
        e.zipCode = t("profile.zip4Error");
      else if (form.country === "DE" && !/^\d{5}$/.test(form.zipCode)) 
        e.zipCode = t("profile.zip5Error");
      if (!form.place) e.place = t("profile.placeRequired");
    }
    
    if (section === 'bank') {
      if (!form.iban) e.iban = t("profile.ibanRequired");
    }
    
    if (section === 'vat') {
      if (form.defaultVat && parseFloat(form.defaultVat) > 0 && !form.vatNumber) 
        e.vatNumber = t("profile.vatNumberRequired");
    }
    
    setErrors(prev => ({...prev, ...e}));
    return Object.keys(e).length === 0;
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.firstName) e.firstName = t("profile.firstNameRequired");
    if (!form.lastName) e.lastName = t("profile.lastNameRequired");
    if (!form.street) e.street = t("profile.streetRequired");
    if (!form.zipCode) e.zipCode = t("profile.zipRequired");
    else if ((form.country === "CH" || form.country === "AT") && !/^\d{4}$/.test(form.zipCode)) 
      e.zipCode = t("profile.zip4Error");
    else if (form.country === "DE" && !/^\d{5}$/.test(form.zipCode)) 
      e.zipCode = t("profile.zip5Error");
    if (!form.place) e.place = t("profile.placeRequired");
    if (!form.iban) e.iban = t("profile.ibanRequired");
    if (form.defaultVat && parseFloat(form.defaultVat) > 0 && !form.vatNumber) 
      e.vatNumber = t("profile.vatNumberRequired");
    setErrors(e); 
    return Object.keys(e).length === 0;
  }

  async function saveSection(section: string) {
    if (!validateSection(section)) return;
    
    // Set loading state
    setSavingSections(prev => ({...prev, [section]: true}));
    
    // Prepare the payload with current form data
    const payload: any = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      company: form.company.trim(),
      street: form.street.trim(),
      street2: form.street2.trim(),
      zipCode: form.zipCode.trim(),
      place: form.place.trim(),
      country: form.country,
      phone: form.phone.trim(),
      mobile: form.mobile.trim(),
      iban: form.iban.trim(),
      currency: form.currency,
      defaultVat: form.defaultVat && form.defaultVat.trim() !== "" ? parseFloat(form.defaultVat) : null,
      vatNumber: form.vatNumber.trim(),
      emailSubject: form.emailSubject?.trim() || undefined,
      emailBody: form.emailBody?.trim() || undefined,
    };
    
    try {
      // Save to database via API
      const res = await fetch('/api/org', { 
        method: 'POST', 
        headers: { 'content-type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (res.ok) {
        // Mark section as saved and disable editing
        setSavedSections(prev => ({...prev, [section]: true}));
        setEditingSections(prev => ({...prev, [section]: false}));
        
        // Clear errors for this section
        const newErrors = {...errors};
        Object.keys(newErrors).forEach(key => {
          if (section === 'personal' && ['firstName', 'lastName', 'phone', 'mobile'].includes(key)) delete newErrors[key];
          if (section === 'address' && ['company', 'street', 'street2', 'zipCode', 'place', 'country'].includes(key)) delete newErrors[key];
          if (section === 'bank' && ['iban', 'currency'].includes(key)) delete newErrors[key];
          if (section === 'vat' && ['defaultVat', 'vatNumber'].includes(key)) delete newErrors[key];
        });
        setErrors(newErrors);
        
        // Show success feedback and keep section disabled until Edit
        setSectionStatus(prev => ({
          ...prev,
          [section]: { type: 'success', message: t("profile.savedSuccess") }
        }));
        
        // Clear status after 3 seconds
        setTimeout(() => {
          setSectionStatus(prev => ({ ...prev, [section]: null }));
        }, 3000);
      } else {
        const errorData = await res.json();
        setSectionStatus(prev => ({
          ...prev,
          [section]: { type: 'error', message: `${t("profile.failedSave")}: ${errorData.error || t("error.somethingWrong")}` }
        }));
        
        // Clear error status after 5 seconds
        setTimeout(() => {
          setSectionStatus(prev => ({ ...prev, [section]: null }));
        }, 5000);
      }
    } catch (error) {
      setSectionStatus(prev => ({
        ...prev,
        [section]: { type: 'error', message: `${t("profile.failedSave")}: ${t("invoice.networkError")}` }
      }));
      
      // Clear error status after 5 seconds
      setTimeout(() => {
        setSectionStatus(prev => ({ ...prev, [section]: null }));
      }, 5000);
    } finally {
      // Clear loading state
      setSavingSections(prev => ({...prev, [section]: false}));
    }
  }
  
  function editSection(section: string) {
    setEditingSections(prev => ({...prev, [section]: true}));
    setSavedSections(prev => ({...prev, [section]: false}));
  }

  async function regenerateInvoices() {
    setRegenerating(true);
    setRegenerateResult(null);
    try {
      const res = await fetch('/api/org/regenerate-invoices', { method: 'POST' });
      setRegenerateResult(res.ok ? t("profile.regenerateSuccess") : t("profile.failedSave"));
    } catch {
      setRegenerateResult(t("profile.failedSave"));
    } finally {
      setRegenerating(false);
      setShowRegenerate(false);
      regeneratePromptedRef.current = false;
    }
  }

  function dismissRegenerate() {
    setShowRegenerate(false);
    regeneratePromptedRef.current = false;
  }

  async function submit() {
    if (!validate()) return;
    const payload: any = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      company: form.company.trim(),
      street: form.street.trim(),
      street2: form.street2.trim(),
      zipCode: form.zipCode.trim(),
      place: form.place.trim(),
      country: form.country,
      phone: form.phone.trim(),
      mobile: form.mobile.trim(),
      iban: form.iban.trim(),
      currency: form.currency,
      defaultVat: form.defaultVat && form.defaultVat.trim() !== "" ? parseFloat(form.defaultVat) : null,
      vatNumber: form.vatNumber.trim(),
      emailSubject: form.emailSubject?.trim() || undefined,
      emailBody: form.emailBody?.trim() || undefined,
    };
    const res = await fetch('/api/org', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) {
      // Re-fetch to ensure the form reflects DB state exactly
      const getRes = await fetch('/api/org');
      if (getRes.ok) {
        const data = await getRes.json();
        const org = data?.org || {};
        setForm({
          firstName: org.firstName || "",
          lastName: org.lastName || "",
          company: org.company || "",
          street: org.street || "",
          street2: org.street2 || "",
          zipCode: org.zipCode || "",
          place: org.place || "",
          country: org.country || "CH",
          phone: org.phone || "",
          mobile: org.mobile || "",
          iban: org.iban || "",
          currency: org.currency || "CHF",
          defaultVat: org.defaultVat != null ? String(org.defaultVat) : "",
          vatNumber: org.vatNumber || "",
          emailSubject: org.emailSubject || t("profile.emailSubjectDefault"),
          emailBody: org.emailBody || t("profile.emailBodyDefault"),
        });
      }
      setSavedSections({ personal: true, address: true, bank: true, vat: Boolean(payload.vatNumber), email: Boolean(form.emailSubject || form.emailBody) });
      // Keep all sections greyed out until user clicks Edit
      setEditingSections({ personal: false, address: false, bank: false, vat: false, email: false });
      // Set success status for all sections
      setSectionStatus({
        personal: { type: 'success', message: t("profile.profileSaved") },
        address: { type: 'success', message: t("profile.profileSaved") },
        bank: { type: 'success', message: t("profile.profileSaved") },
        vat: { type: 'success', message: t("profile.profileSaved") },
        email: { type: 'success', message: t("profile.profileSaved") },
      });
      
      // Clear all status after 3 seconds
      setTimeout(() => {
        setSectionStatus({
          personal: null,
          address: null,
          bank: null,
          vat: null,
          email: null,
        });
      }, 3000);
    } else {
      // Set error status for all sections
      setSectionStatus({
        personal: { type: 'error', message: t("profile.failedSave") },
        address: { type: 'error', message: t("profile.failedSave") },
        bank: { type: 'error', message: t("profile.failedSave") },
        vat: { type: 'error', message: t("profile.failedSave") },
        email: { type: 'error', message: t("profile.failedSave") },
      });
      
      // Clear all status after 5 seconds
      setTimeout(() => {
        setSectionStatus({
          personal: null,
          address: null,
          bank: null,
          vat: null,
          email: null,
        });
      }, 5000);
    }
  }

  const inputClass = "w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 bg-white";
  const errorClass = " border-red-500 ring-2 ring-red-300";

  if (loading) {
    return <div className="p-6 text-sm text-gray-600">{t("profile.loading")}</div>;
  }

  return (
    <>
      {regenerateResult && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
          {regenerateResult}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Personal Details */}
      <Card className={!editingSections.personal ? "opacity-80" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">{t("profile.personalDetails")}</CardTitle>
              {sectionStatus.personal && (
                <div className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                  sectionStatus.personal.type === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {sectionStatus.personal.type === 'success' ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  {sectionStatus.personal.message}
                </div>
              )}
            </div>
            {editingSections.personal ? (
              <button onClick={() => saveSection('personal')} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">{t("common.save")}</button>
            ) : (
              <button 
                onClick={() => editSection('personal')}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-400"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>{t("common.saved")}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.firstName")} *</label>
              <input 
                className={inputClass + (errors.firstName ? errorClass : "")} 
                placeholder={t("common.firstName")} 
                value={form.firstName} 
                onChange={e => setForm({...form, firstName: e.target.value})}
                disabled={!editingSections.personal}
                suppressHydrationWarning 
              />
              {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.lastName")} *</label>
              <input 
                className={inputClass + (errors.lastName ? errorClass : "")} 
                placeholder={t("common.lastName")} 
                value={form.lastName} 
                onChange={e => setForm({...form, lastName: e.target.value})}
                disabled={!editingSections.personal}
                suppressHydrationWarning 
              />
              {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.phone")}</label>
              <input 
                className={inputClass} 
                placeholder={t("common.phone")} 
                value={form.phone} 
                onChange={e => setForm({...form, phone: e.target.value})}
                disabled={!editingSections.personal}
                suppressHydrationWarning 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.mobile")}</label>
              <input 
                className={inputClass} 
                placeholder={t("common.mobile")} 
                value={form.mobile} 
                onChange={e => setForm({...form, mobile: e.target.value})}
                disabled={!editingSections.personal}
                suppressHydrationWarning 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Details */}
      <Card className={!editingSections.address ? "opacity-80" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">{t("profile.address")}</CardTitle>
              {sectionStatus.address && (
                <div className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                  sectionStatus.address.type === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {sectionStatus.address.type === 'success' ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  {sectionStatus.address.message}
                </div>
              )}
            </div>
            {editingSections.address ? (
              <button onClick={() => saveSection('address')} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">{t("common.save")}</button>
            ) : (
              <button 
                onClick={() => editSection('address')}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-400"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>{t("common.saved")}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.companyName")}</label>
            <input 
              className={inputClass} 
              placeholder={t("common.companyOptional")} 
              value={form.company} 
              onChange={e => setForm({...form, company: e.target.value})}
              disabled={!editingSections.address}
              suppressHydrationWarning 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.street")} *</label>
            <input 
              className={inputClass + (errors.street ? errorClass : "")} 
              placeholder={t("common.street")} 
              value={form.street} 
              onChange={e => setForm({...form, street: e.target.value})}
              disabled={!editingSections.address}
              suppressHydrationWarning 
            />
            {errors.street && <p className="text-xs text-red-600 mt-1">{errors.street}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.street2")}</label>
            <input 
              className={inputClass} 
              placeholder={t("common.street2Optional")} 
              value={form.street2} 
              onChange={e => setForm({...form, street2: e.target.value})}
              disabled={!editingSections.address}
              suppressHydrationWarning 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.zip")} *</label>
              <input 
                className={inputClass + (errors.zipCode ? errorClass : "")} 
                placeholder={getZipPlaceholder()} 
                value={form.zipCode} 
                onChange={e => handleZipChange(e.target.value)}
                maxLength={getZipMaxLength()}
                disabled={!editingSections.address}
                suppressHydrationWarning 
              />
              {errors.zipCode && <p className="text-xs text-red-600 mt-1">{errors.zipCode}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.place")} *</label>
              <input 
                className={inputClass + (errors.place ? errorClass : "")} 
                placeholder={t("common.place")} 
                value={form.place} 
                onChange={e => setForm({...form, place: e.target.value})}
                disabled={!editingSections.address}
                suppressHydrationWarning 
              />
              {errors.place && <p className="text-xs text-red-600 mt-1">{errors.place}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.country")}</label>
            <select 
              className={inputClass}
              value={form.country} 
              onChange={e => setForm({...form, country: e.target.value, defaultVat: ""})} // Reset VAT when country changes
              disabled={!editingSections.address}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card className={!editingSections.bank ? "opacity-80" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">{t("profile.bankDetails")}</CardTitle>
              {sectionStatus.bank && (
                <div className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                  sectionStatus.bank.type === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {sectionStatus.bank.type === 'success' ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  {sectionStatus.bank.message}
                </div>
              )}
            </div>
            {editingSections.bank ? (
              <button onClick={() => saveSection('bank')} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">{t("common.save")}</button>
            ) : (
              <button 
                onClick={() => editSection('bank')}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-400"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>{t("common.saved")}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.iban")} *</label>
            <input 
              className={inputClass + (errors.iban ? errorClass : "")} 
              placeholder={t("common.iban")} 
              value={form.iban} 
              onChange={e => setForm({...form, iban: e.target.value})}
              disabled={!editingSections.bank}
              suppressHydrationWarning 
            />
            {errors.iban && <p className="text-xs text-red-600 mt-1">{errors.iban}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.currency")}</label>
            <select 
              className={inputClass}
              value={form.currency} 
              onChange={e => setForm({...form, currency: e.target.value})}
              disabled={!editingSections.bank}
            >
              <option>CHF</option>
              <option>EUR</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* VAT Details */}
      <Card className={!editingSections.vat ? "opacity-80" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">{t("profile.vatSettings")}</CardTitle>
              {sectionStatus.vat && (
                <div className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                  sectionStatus.vat.type === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {sectionStatus.vat.type === 'success' ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  {sectionStatus.vat.message}
                </div>
              )}
            </div>
            {editingSections.vat ? (
              <button onClick={() => saveSection('vat')} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">{t("common.save")}</button>
            ) : (
              <button 
                onClick={() => editSection('vat')}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-400"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>{t("common.saved")}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.defaultVat")}</label>
            <select 
              className={inputClass}
              value={form.defaultVat} 
              onChange={e => setForm({...form, defaultVat: e.target.value})}
              disabled={!editingSections.vat}
            >
              {getVatOptions().map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          {form.defaultVat && parseFloat(form.defaultVat) > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.vatNumber")}</label>
              <input 
                className={inputClass + (errors.vatNumber ? errorClass : "")} 
                placeholder={form.country === "CH" ? t("profile.vatCh") : form.country === "DE" ? t("profile.vatDe") : t("profile.vatAt")}
                value={form.vatNumber} 
                onChange={e => setForm({...form, vatNumber: e.target.value})}
                disabled={!editingSections.vat}
                suppressHydrationWarning 
              />
              {errors.vatNumber && <p className="text-xs text-red-600 mt-1">{errors.vatNumber}</p>}
              <p className="text-xs text-gray-500 mt-1">{t("profile.requiredWhenVat")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Template */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">{t("profile.emailTemplate")}</CardTitle>
              {sectionStatus.email && (
                <div className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                  sectionStatus.email.type === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {sectionStatus.email.type === 'success' ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  {sectionStatus.email.message}
                </div>
              )}
            </div>
            {editingSections.email ? (
              <button onClick={() => saveSection('email')} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">{t("common.save")}</button>
            ) : (
              <button 
                onClick={() => editSection('email')}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-400"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>{t("common.saved")}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.subject")}</label>
              <input 
                className={inputClass}
                value={form.emailSubject}
                onChange={e => setForm({...form, emailSubject: e.target.value})}
                placeholder={t("profile.emailSubjectDefault")}
                disabled={!editingSections.email}
                suppressHydrationWarning
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.body")}</label>
              <textarea
                className={inputClass + " min-h-[240px]"}
                value={form.emailBody}
                onChange={e => setForm({...form, emailBody: e.target.value})}
                placeholder={t("profile.emailBodyPlaceholder")}
                disabled={!editingSections.email}
                suppressHydrationWarning
              />
              <p className="text-xs text-gray-500 mt-2">{t("profile.plainTextNote")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>

      {showRegenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={dismissRegenerate}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900">{t("profile.regenerateTitle")}</h2>
            <p className="mt-2 text-sm text-gray-600">{t("profile.regenerateBody")}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={dismissRegenerate} className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50">
                {t("profile.regenerateCancel")}
              </button>
              <button onClick={regenerateInvoices} disabled={regenerating} className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                {regenerating ? "…" : t("profile.regenerateConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
