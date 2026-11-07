export async function sendMail(opts: { to: string; subject: string; html?: string; text?: string; from?: string }) {
  const { to, subject, html, text, from } = opts;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddr = from || process.env.FROM_EMAIL || "noreply@facturio.ch";

  // If Resend is configured, use it
  if (resendApiKey) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendApiKey);
      const result: any = await resend.emails.send({
        from: fromAddr,
        to,
        subject,
        html: html || text || "",
        text,
      });
      if (result?.error) {
        console.error(`[mailer] Resend error for ${to}:`, result.error);
        return { ok: false, dev: false } as const;
      }
      const id = result?.data?.id || result?.id || "unknown";
      console.log(`[mailer] Email sent via Resend to ${to} (id=${id})`);
      return { ok: true, dev: false } as const;
    } catch (err) {
      console.error("[mailer] Failed to send email via Resend:", err);
      console.info("--- EMAIL (fallback log) ---\nTo:", to, "\nSubject:", subject, "\nText:", text || "(no text)", "\nHTML:", html || "(no html)");
      return { ok: false, dev: true } as const;
    }
  }

  // Fallback to SMTP if configured
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({ from: fromAddr, to, subject, text, html });
      console.log(`[mailer] Email sent via SMTP to ${to}`);
      return { ok: true, dev: false } as const;
    } catch (err) {
      console.error("[mailer] Failed to send email via SMTP:", err);
      console.info("--- EMAIL (fallback log) ---\nTo:", to, "\nSubject:", subject, "\nText:", text || "(no text)", "\nHTML:", html || "(no html)");
      return { ok: false, dev: true } as const;
    }
  }

  // Development mode - just log to console
  console.warn("[mailer] No email service configured. Logging email to console.");
  console.info("--- EMAIL (dev) ---\nTo:", to, "\nSubject:", subject, "\nText:", text || "(no text)", "\nHTML:", html || "(no html)");
  return { ok: true, dev: true } as const;
}

