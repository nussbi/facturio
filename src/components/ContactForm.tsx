"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { COUNTRIES } from "@/lib/countries";
import { useLanguage } from "@/components/language-context";
import posthog from "posthog-js";

export function ContactForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const { show } = useToast();
  const [loading, startTransition] = useTransition();
  const [form, setForm] = useState({
    company: "",
    firstName: "",
    lastName: "",
    street: "",
    street2: "",
    zipCode: "",
    place: "",
    email: "",
    telephoneFix: "",
    mobile: "",
    country: "CH",
    currency: "CHF",
    iban: "",
  });



  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t("contact.validEmail");
    if (!form.street) e.street = t("profile.streetRequired");
    if (!form.zipCode) e.zipCode = t("profile.zipRequired");
    if (!form.place) e.place = t("profile.placeRequired");
    if (!form.iban || !form.iban.trim()) e.iban = t("profile.ibanRequired");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    const res = await fetch("/app/api/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form }),
    });
    if (res.ok) {
      posthog.capture("contact_created", {
        country: form.country,
        currency: form.currency,
        has_company: Boolean(form.company),
      });
      setForm({ company: "", firstName: "", lastName: "", street: "", street2: "", zipCode: "", place: "", email: "", telephoneFix: "", mobile: "", country: "CH", currency: "CHF", iban: "" });
      setErrors({});
      show({ title: t("contact.created"), variant: "success" });
      window.location.reload();
    } else {
      let msg = t("contact.failedCreate");
      try {
        const j = await res.json();
        const err = (j && (j.error || j)) || {};
        if (typeof err === 'string') msg = err;
        else if ((err as any).company) msg = String((err as any).company);
        else if ((err as any).iban) msg = String((err as any).iban);
        else if ((err as any).message) msg = String((err as any).message);
        if ((err as any).fieldErrors) {
          const fe = (err as any).fieldErrors as Record<string, string[]>;
          // Push field errors into local UI
          const uiErrors: Record<string, string> = {};
          for (const [k, arr] of Object.entries(fe)) {
            if (Array.isArray(arr) && arr[0]) uiErrors[k] = arr[0];
          }
          setErrors(prev => ({ ...prev, ...uiErrors }));
          const parts = Object.values(uiErrors).filter(Boolean);
          if (parts.length) msg = parts.join("; ");
        } else if ((err as any).formErrors && Array.isArray((err as any).formErrors)) {
          const parts = ((err as any).formErrors as string[]).filter(Boolean);
          if (parts.length) msg = parts.join("; ");
        }
        show({ title: msg, variant: "error" });
        // Log as a single string to avoid DevTools collapsing to {}
        console.error(`[${res.status}] ${msg} :: ${JSON.stringify(err)}`);
      } catch {
        const text = await res.text().catch(() => "");
        show({ title: msg, variant: "error" });
        if (text) console.error(`[${res.status}] ${msg} :: ${text}`);
      }
    }
  }

  const input = "border border-border rounded-md px-3 py-2 bg-card text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background";
  const selectCls = input;

  const label = "block text-sm font-medium mb-1 text-muted-foreground";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={label}>{t("common.companyOptional")}</label>
          <input className={input + (errors.company? " border-destructive ring-2 ring-destructive/40" : "")} placeholder={t("common.company")} value={form.company} onChange={e=>setForm({...form, company:e.target.value})} />
          {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
        </div>
        <div>
          <label className={label}>{t("common.email")}</label>
          <input className={input + (errors.email? " border-destructive ring-2 ring-destructive/40" : "")} placeholder="name@example.com" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className={label}>{t("common.firstName")}</label>
          <input className={input} placeholder={t("common.firstName")} value={form.firstName} onChange={e=>setForm({...form, firstName:e.target.value})} />
        </div>
        <div>
          <label className={label}>{t("common.lastName")}</label>
          <input className={input} placeholder={t("common.lastName")} value={form.lastName} onChange={e=>setForm({...form, lastName:e.target.value})} />
        </div>
        <div className="md:col-span-2">
          <label className={label}>{t("common.street")}</label>
          <input className={input + (errors.street? " border-destructive ring-2 ring-destructive/40" : "") + " w-full"} placeholder={t("common.street")} value={form.street} onChange={e=>setForm({...form, street:e.target.value})} />
          {errors.street && <p className="text-xs text-destructive mt-1">{errors.street}</p>}
        </div>
        <div className="md:col-span-2">
          <label className={label}>{t("common.street2Optional")}</label>
          <input className={input + " w-full"} placeholder={t("common.street2Optional")} value={(form as any).street2 ?? ""} onChange={e=>setForm({...form, street2:e.target.value})} />
        </div>
        <div>
          <label className={label}>{t("common.zip")}</label>
          <input className={input + (errors.zipCode? " border-destructive ring-2 ring-destructive/40" : "")} placeholder={t("common.zip")} value={form.zipCode} onChange={e=>setForm({...form, zipCode:e.target.value})} />
          {errors.zipCode && <p className="text-xs text-destructive mt-1">{errors.zipCode}</p>}
        </div>
        <div>
          <label className={label}>{t("common.place")}</label>
          <input className={input + (errors.place? " border-destructive ring-2 ring-destructive/40" : "")} placeholder={t("common.place")} value={form.place} onChange={e=>setForm({...form, place:e.target.value})} />
          {errors.place && <p className="text-xs text-destructive mt-1">{errors.place}</p>}
        </div>
        <div>
          <label className={label}>{t("common.telephoneOptional")}</label>
          <input className={input} placeholder={t("common.phone")} value={form.telephoneFix} onChange={e=>setForm({...form, telephoneFix:e.target.value})} />
        </div>
        <div>
          <label className={label}>{t("common.mobileOptional")}</label>
          <input className={input} placeholder={t("common.mobile")} value={form.mobile} onChange={e=>setForm({...form, mobile:e.target.value})} />
        </div>
        <div>
          <label className={label}>{t("common.country")}</label>
          <select className={selectCls} value={form.country} onChange={e=>setForm({...form, country:e.target.value})}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>{t("common.currency")}</label>
          <select className={selectCls} value={form.currency} onChange={e=>setForm({...form, currency:e.target.value})}>
            <option>CHF</option>
            <option>EUR</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={label}>{t("common.iban")}</label>
          <input className={input + (errors.iban ? " border-destructive ring-2 ring-destructive/40" : "") + " w-full"} placeholder={t("common.iban")} value={(form as any).iban ?? ""} onChange={e=>setForm({...form, iban: e.target.value})} />
          {errors.iban && <p className="text-xs text-destructive mt-1">{errors.iban}</p>}
        </div>
      </div>
      <div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:brightness-105" onClick={()=>startTransition(submit)} disabled={loading}>{t("contact.addContact")}</button>
      </div>
    </div>
  );
}
