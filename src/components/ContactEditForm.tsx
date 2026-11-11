"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/components/language-context";
import posthog from "posthog-js";

export default function ContactEditForm({ id, initial }: { id: string; initial: any }) {
  const { t } = useLanguage();
  const { show } = useToast();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ ...initial });
  const input = "border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 bg-white";
  const selectCls = input;

  async function submit() {
    const res = await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        company: form.company || undefined,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        street: form.street || undefined,
        street2: form.street2 || undefined,
        zipCode: form.zipCode || undefined,
        place: form.place || undefined,
        telephoneFix: form.telephoneFix || undefined,
        mobile: form.mobile || undefined,
        email: form.email || undefined,
        country: form.country || undefined,
        currency: form.currency || undefined,
        iban: form.iban || undefined,
      })
    });
    if (res.ok) { posthog.capture("contact_updated", { country: form.country ?? "CH", currency: form.currency ?? "CHF" }); show({ title: t("contacts.updated"), variant: "success" }); window.location.href = `/contacts/${id}`; } else { show({ title: t("contacts.updateFailed"), variant: "error" }); }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className={input} placeholder={t("common.companyOptional")} value={form.company||""} onChange={e=>setForm({...form, company:e.target.value})} />
        <div>
          <input className={input} placeholder={t("common.email")} value={form.email||""} onChange={e=>setForm({...form, email:e.target.value})} />
        </div>
        <input className={input} placeholder={t("common.firstName")} value={form.firstName||""} onChange={e=>setForm({...form, firstName:e.target.value})} />
        <input className={input} placeholder={t("common.lastName")} value={form.lastName||""} onChange={e=>setForm({...form, lastName:e.target.value})} />
        <div className="md:col-span-2">
          <input className={input + " w-full"} placeholder={t("common.street")} value={form.street||""} onChange={e=>setForm({...form, street:e.target.value})} />
        </div>
        <input className={input + " md:col-span-2"} placeholder={t("common.street2Optional")} value={form.street2||""} onChange={e=>setForm({...form, street2:e.target.value})} />
        <div>
          <input className={input} placeholder={t("common.zip")} value={form.zipCode||""} onChange={e=>setForm({...form, zipCode:e.target.value})} />
        </div>
        <div>
          <input className={input} placeholder={t("common.place")} value={form.place||""} onChange={e=>setForm({...form, place:e.target.value})} />
        </div>
        <div>
          <input className={input} placeholder={t("common.telephoneOptional")} value={form.telephoneFix||""} onChange={e=>setForm({...form, telephoneFix:e.target.value})} />
        </div>
        <div>
          <input className={input} placeholder={t("common.mobileOptional")} value={form.mobile||""} onChange={e=>setForm({...form, mobile:e.target.value})} />
        </div>
        <select className={selectCls} value={form.country||"CH"} onChange={e=>setForm({...form, country:e.target.value})}>
          <option value="CH">{t("common.switzerland")}</option>
          <option value="DE">{t("common.germany")}</option>
          <option value="AT">{t("common.austria")}</option>
          <option value="LI">{t("common.liechtenstein")}</option>
        </select>
        <select className={selectCls} value={form.currency||"CHF"} onChange={e=>setForm({...form, currency:e.target.value})}>
          <option>CHF</option>
          <option>EUR</option>
        </select>
        <input className={input + " md:col-span-2"} placeholder={t("common.iban")} value={form.iban||""} onChange={e=>setForm({...form, iban:e.target.value})} />
      </div>
      <div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={()=>start(submit)} disabled={pending}>{t("common.save")}</button>
      </div>
    </div>
  );
}
