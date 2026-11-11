"use client";

import { useState, useTransition } from "react";
import { formatSwissNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/components/language-context";
import posthog from "posthog-js";

export function SimpleExpenseForm({ 
  contacts = [] as { id: string; name: string }[] 
}: { 
  contacts?: { id: string; name: string }[] 
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const { show } = useToast();
  const [loading, startTransition] = useTransition();
  const [form, setForm] = useState({
    description: "",
    quantity: 1,
    unit: "item",
    unitPrice: 0,
    currency: "CHF",
    contactId: "",
  });

  const [errors, setErrors] = useState<Record<string,string>>({});

  function validate() {
    const e: Record<string,string> = {};
    if (!form.description.trim()) e.description = t("expense.descriptionRequired");
    if (!form.unit.trim()) e.unit = t("expense.unitRequired");
    if (form.quantity <= 0) e.quantity = t("expense.quantityGt0Long");
    if (form.unitPrice < 0) e.unitPrice = t("expense.unitPriceGte0Long");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    
    const res = await fetch("/app/api/expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 
        ...form, 
        type: "ITEM" // Always set to ITEM since we removed time tracking
      }),
    });
    
    if (res.ok) {
      posthog.capture("expense_created", {
        currency: form.currency,
        has_contact: Boolean(form.contactId),
      });
      show({ title: t("expense.addedSuccess"), variant: "success" });
      router.push('/expenses');
    } else {
      show({ title: t("expense.failedAdd"), variant: "error" });
      console.error(await res.json());
    }
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const selectClass = inputClass;
  const errorClass = " border-red-500 ring-2 ring-red-500/20";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("common.description")} *
          </label>
          <input
            className={inputClass + (errors.description ? errorClass : "")}
            placeholder={t("expense.whatFor")}
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
          />
          {errors.description && (
            <p className="text-xs text-red-600 mt-1">{errors.description}</p>
          )}
        </div>

        {/* Customer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("common.customer")}
          </label>
          <select
            className={selectClass}
            value={form.contactId}
            onChange={e => setForm({...form, contactId: e.target.value})}
          >
            <option value="">{t("expense.noCustomer")}</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("common.currency")}
          </label>
          <select
            className={selectClass}
            value={form.currency}
            onChange={e => setForm({...form, currency: e.target.value})}
          >
            <option value="CHF">CHF</option>
            <option value="EUR">EUR</option>
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("common.quantity")} *
          </label>
          <input
            className={inputClass + (errors.quantity ? errorClass : "")}
            type="number"
            step="0.01"
            min="0"
            placeholder="1"
            value={form.quantity}
            onChange={e => setForm({...form, quantity: parseFloat(e.target.value) || 0})}
          />
          {errors.quantity && (
            <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>
          )}
        </div>

        {/* Unit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("common.unit")} *
          </label>
          <input
            className={inputClass + (errors.unit ? errorClass : "")}
            placeholder={t("expense.unitPlaceholder")}
            value={form.unit}
            onChange={e => setForm({...form, unit: e.target.value})}
          />
          {errors.unit && (
            <p className="text-xs text-red-600 mt-1">{errors.unit}</p>
          )}
        </div>

        {/* Unit Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("common.unitPrice")} *
          </label>
          <input
            className={inputClass + (errors.unitPrice ? errorClass : "")}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.unitPrice}
            onChange={e => setForm({...form, unitPrice: parseFloat(e.target.value) || 0})}
          />
          {errors.unitPrice && (
            <p className="text-xs text-red-600 mt-1">{errors.unitPrice}</p>
          )}
        </div>

        {/* Total (calculated) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("common.total")}
          </label>
          <div className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-700 font-medium">
            {formatSwissNumber(form.quantity * form.unitPrice)} {form.currency}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button 
          onClick={() => startTransition(submit)} 
          disabled={loading}
          className="flex-1"
        >
          {loading ? t("expense.adding") : t("expenses.addExpense")}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          disabled={loading}
        >
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
