"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLanguage } from "@/components/language-context";

export type QrOptions = {
  graphicsFormat: "PDF" | "SVG" | "PNG";
  outputSize: "A4_PORTRAIT_SHEET" | "QR_BILL_ONLY" | "QR_BILL_EXTRA_SPACE" | "QR_CODE_ONLY" | "QR_CODE_WITH_QUIET_ZONE" | "PAYMENT_PART_ONLY";
  separatorType: "NONE" | "SOLID_LINE" | "SOLID_LINE_WITH_SCISSORS" | "DASHED_LINE" | "DASHED_LINE_WITH_SCISSORS" | "DOTTED_LINE" | "DOTTED_LINE_WITH_SCISSORS";
  language: "DE" | "FR" | "IT" | "RM" | "EN";
  resolution?: number; // for PNG
  localCountryCode?: string;
  billInformation?: string;
  alternativeSchemes?: { name: string; instruction: string }[];
};

const DEFAULTS: QrOptions = {
  graphicsFormat: "SVG",
  outputSize: "QR_BILL_ONLY",
  separatorType: "DASHED_LINE_WITH_SCISSORS",
  language: "EN",
  resolution: 144,
  localCountryCode: "CH",
  billInformation: "",
  alternativeSchemes: [],
};

export default function QrBillOptions() {
  const { t } = useLanguage();
  const [opts, setOpts] = useState<QrOptions>(DEFAULTS);

  useEffect(() => {
    const raw = localStorage.getItem("qrOptions");
    if (raw) {
      try { setOpts({ ...DEFAULTS, ...JSON.parse(raw) }); } catch {}
    }
  }, []);

  function save() {
    localStorage.setItem("qrOptions", JSON.stringify(opts));
  }

  const input = "border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 bg-white";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("qr.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">
            <span className="block mb-1 text-gray-600">{t("qr.graphicsFormat")}</span>
            <select className={input} value={opts.graphicsFormat} onChange={e=>setOpts({...opts, graphicsFormat: e.target.value as any})}>
              <option>SVG</option>
              <option>PDF</option>
              <option>PNG</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-gray-600">{t("qr.language")}</span>
            <select className={input} value={opts.language} onChange={e=>setOpts({...opts, language: e.target.value as any})}>
              <option>DE</option>
              <option>FR</option>
              <option>IT</option>
              <option>RM</option>
              <option>EN</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-gray-600">{t("qr.outputSize")}</span>
            <select className={input} value={opts.outputSize} onChange={e=>setOpts({...opts, outputSize: e.target.value as any})}>
              <option value="A4_PORTRAIT_SHEET">{t("qr.a4Portrait")}</option>
              <option value="QR_BILL_ONLY">{t("qr.qrBillOnly")}</option>
              <option value="QR_BILL_EXTRA_SPACE">{t("qr.qrBillExtra")}</option>
              <option value="PAYMENT_PART_ONLY">{t("qr.paymentPartOnly")}</option>
              <option value="QR_CODE_ONLY">{t("qr.qrCodeOnly")}</option>
              <option value="QR_CODE_WITH_QUIET_ZONE">{t("qr.qrCodeQuiet")}</option>
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            <span className="block mb-1 text-gray-600">{t("qr.separator")}</span>
            <select className={input} value={opts.separatorType} onChange={e=>setOpts({...opts, separatorType: e.target.value as any})}>
              <option>NONE</option>
              <option>SOLID_LINE</option>
              <option>SOLID_LINE_WITH_SCISSORS</option>
              <option>DASHED_LINE</option>
              <option>DASHED_LINE_WITH_SCISSORS</option>
              <option>DOTTED_LINE</option>
              <option>DOTTED_LINE_WITH_SCISSORS</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-gray-600">{t("qr.resolution")}</span>
            <input type="number" className={input} value={opts.resolution}
              onChange={e=>setOpts({...opts, resolution: parseInt(e.target.value || "0",10) || 144})} />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-gray-600">{t("qr.localCountryCode")}</span>
            <input className={input} value={opts.localCountryCode}
              onChange={e=>setOpts({...opts, localCountryCode: e.target.value})} />
          </label>
          <label className="text-sm md:col-span-3">
            <span className="block mb-1 text-gray-600">{t("qr.billInformation")}</span>
            <input className={input + " w-full"} value={opts.billInformation}
              onChange={e=>setOpts({...opts, billInformation: e.target.value})} />
          </label>
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <span className="block text-sm text-gray-600 mb-1">{t("qr.altScheme1")}</span>
              <input className={input + " mb-2 w-full"} placeholder={t("qr.name")} onChange={e=>{
                const arr = opts.alternativeSchemes?.slice() || [];
                while(arr.length<1) arr.push({name:"", instruction:""});
                arr[0].name = e.target.value; setOpts({...opts, alternativeSchemes: arr});
              }} value={opts.alternativeSchemes?.[0]?.name||""} />
              <input className={input + " w-full"} placeholder={t("qr.instruction")} onChange={e=>{
                const arr = opts.alternativeSchemes?.slice() || [];
                while(arr.length<1) arr.push({name:"", instruction:""});
                arr[0].instruction = e.target.value; setOpts({...opts, alternativeSchemes: arr});
              }} value={opts.alternativeSchemes?.[0]?.instruction||""} />
            </div>
            <div>
              <span className="block text-sm text-gray-600 mb-1">{t("qr.altScheme2")}</span>
              <input className={input + " mb-2 w-full"} placeholder={t("qr.name")} onChange={e=>{
                const arr = opts.alternativeSchemes?.slice() || [];
                while(arr.length<2) arr.push({name:"", instruction:""});
                arr[1].name = e.target.value; setOpts({...opts, alternativeSchemes: arr});
              }} value={opts.alternativeSchemes?.[1]?.name||""} />
              <input className={input + " w-full"} placeholder={t("qr.instruction")} onChange={e=>{
                const arr = opts.alternativeSchemes?.slice() || [];
                while(arr.length<2) arr.push({name:"", instruction:""});
                arr[1].instruction = e.target.value; setOpts({...opts, alternativeSchemes: arr});
              }} value={opts.alternativeSchemes?.[1]?.instruction||""} />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={save}>{t("qr.saveOptions")}</button>
        </div>
      </CardContent>
    </Card>
  );
}
