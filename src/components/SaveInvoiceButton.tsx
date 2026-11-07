"use client";

import { useState } from 'react';
import { FileText, Save, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/language-context';
import { useToast } from '@/components/ui/Toast';

export default function SaveInvoiceButton({ id }: { id: string }) {
  const { t } = useLanguage();
  const { show } = useToast();
  const [busy, setBusy] = useState<'draft' | 'sent' | null>(null);

  async function saveAndDownload() {
    if (busy) return;
    setBusy('sent');
    try {
      // The PDF endpoint confirms the private R2 object before it returns bytes.
      const pdf = await fetch(`/api/invoices/${id}/pdf?format=PDF&download=1`, { credentials: 'include' });
      if (!pdf.ok || !pdf.headers.get('content-type')?.includes('application/pdf')) {
        throw new Error(`PDF archival failed (HTTP ${pdf.status})`);
      }
      const blob = await pdf.blob();
      if (!blob.size) throw new Error('Empty PDF');
      const sent = await fetch(`/api/invoices/${id}/mark-sent`, { method: 'PATCH' });
      if (!sent.ok) throw new Error(`Failed to mark sent (HTTP ${sent.status})`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdf.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1] || `invoice-${id}.pdf`;
      document.body.appendChild(a);
      a.click(); a.remove();
      show({ title: t('common.saved'), variant: 'success' });
      window.setTimeout(() => { URL.revokeObjectURL(url); window.location.reload(); }, 800);
    } catch (error) {
      console.error('Invoice save/download failed', error);
      show({ title: t('invoice.failedSend'), variant: 'error' });
      setBusy(null);
    }
  }

  async function markDraft() {
    if (busy) return;
    setBusy('draft');
    try {
      const pdf = await fetch(`/api/invoices/${id}/pdf?format=PDF`, { credentials: 'include' });
      if (!pdf.ok) throw new Error(`PDF archival failed (HTTP ${pdf.status})`);
      const res = await fetch(`/api/invoices/${id}/mark-draft`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      show({ title: t('status.draft'), variant: 'success' });
      window.location.reload();
    } catch (error) {
      console.error('Invoice draft archival failed', error);
      show({ title: t('invoice.failedSend'), variant: 'error' });
      setBusy(null);
    }
  }

  const base = 'inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50';
  return <div className="flex items-center gap-2">
    <button type="button" onClick={markDraft} disabled={busy !== null}
      className={`${base} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`} title={t('preview.saveDraft')}>
      {busy === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}{t('status.draft')}
    </button>
    <button type="button" onClick={saveAndDownload} disabled={busy !== null}
      className={`${base} bg-blue-600 text-white hover:bg-blue-700`} title={t('invoice.saveAsSent')}>
      {busy === 'sent' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t('common.save')}
    </button>
  </div>;
}
