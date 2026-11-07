import { t, type Lang } from "@/lib/i18n";

export type QrBillAddress = {
  name: string; // name or company
  street: string;
  street2?: string;
  postalCode: string;
  town: string;
  countryCode: string; // ISO 3166-1 alpha-2, e.g. CH
};

export type QrBillPayload = {
  // legacy format key kept for compatibility; prefer graphicsFormat
  format?: "svg" | "pdf" | "png";
  graphicsFormat?: "PDF" | "SVG" | "PNG";
  amount?: number; // optional per spec
  currency: "CHF" | "EUR";
  account: string; // IBAN (CH/LI)
  creditor: QrBillAddress;
  debtor?: QrBillAddress; // optional
  reference?: string; // QR/ISR or ISO 11649 creditor reference
  message?: string;
  billInformation?: string;
  // BillFormat options
  outputSize?: "A4_PORTRAIT_SHEET" | "QR_BILL_ONLY" | "QR_BILL_EXTRA_SPACE" | "QR_CODE_ONLY" | "QR_CODE_WITH_QUIET_ZONE" | "PAYMENT_PART_ONLY";
  separatorType?: "NONE" | "SOLID_LINE" | "SOLID_LINE_WITH_SCISSORS" | "DASHED_LINE" | "DASHED_LINE_WITH_SCISSORS" | "DOTTED_LINE" | "DOTTED_LINE_WITH_SCISSORS";
  language?: "DE" | "FR" | "IT" | "RM" | "EN";
  lang?: Lang; // app language (en/de/fr/it) for the invoice document text
  plan?: string; // user plan ("FREE"|"PRO"); PRO suppresses the facturio.ch watermark
  resolution?: number; // for PNG
  localCountryCode?: string;
  alternativeSchemes?: { name: string; instruction: string }[];
  // Invoice-specific data for full PDF generation
  invoiceData?: {
    number: number;
    issueDate: string;
    dueDate?: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    totalTax?: number;
    totalGross: number;
  };
};

export function buildQrBillPayload(args: Partial<QrBillPayload> & {
  creditor: QrBillAddress;
  currency: "CHF" | "EUR";
  account: string;
}): QrBillPayload {
  const payload: QrBillPayload = {
    graphicsFormat: args.graphicsFormat,
    format: args.format ?? (args.graphicsFormat ? args.graphicsFormat.toLowerCase() as any : "svg"),
    amount: args.amount,
    currency: args.currency,
    account: args.account,
    creditor: args.creditor,
    debtor: args.debtor,
    reference: args.reference,
    message: args.message,
    billInformation: args.billInformation,
    outputSize: args.outputSize,
    separatorType: args.separatorType,
    language: args.language,
    lang: args.lang,
    plan: args.plan,
    resolution: args.resolution,
    localCountryCode: args.localCountryCode,
    alternativeSchemes: args.alternativeSchemes,
    invoiceData: args.invoiceData,
  };
  return payload;
}

// Swiss/Liechtenstein IBANs are the only ones supported by the Swiss QR-bill (SIX standard).
export function isSwissIban(iban?: string | null): boolean {
  const cleaned = (iban || "").replace(/[\s-]/g, "").toUpperCase();
  return /^(CH|LI)\d{2}[A-Z0-9]{10,30}$/.test(cleaned);
}

// Snapshot the sender (org) + customer (contact) address onto an invoice so that
// SENT invoices freeze the address as it was at send time — a later profile or
// contact address change must NOT retroactively rewrite an already-sent QR-bill.
export function buildAddressSnapshot(org: any, contact: any): string {
  return JSON.stringify({
    sender: {
      name: (org?.company || `${org?.firstName ?? ""} ${org?.lastName ?? ""}`.trim()) || "",
      street: org?.street || "",
      street2: org?.street2 || "",
      zip: org?.zipCode || "",
      place: org?.place || "",
      country: org?.country || "CH",
      iban: org?.iban || "",
    },
    customer: {
      name: contact?.company ?? `${contact?.firstName ?? ""} ${contact?.lastName ?? ""}`.trim(),
      street: contact?.street || "",
      street2: contact?.street2 || "",
      zip: contact?.zipCode || "",
      place: contact?.place || "",
      country: contact?.country || "CH",
    },
  });
}

// Resolve the creditor/debtor + IBAN for an invoice: use the frozen snapshot for
// SENT invoices, and the live org/contact for DRAFT (so drafts keep tracking edits).
export function resolveCreditorDebtor(invoice: any, org: any): {
  creditor: QrBillAddress;
  debtor: QrBillAddress;
  account: string;
} {
  if (invoice?.status === "SENT" && invoice?.addressSnapshot) {
    try {
      const snap = JSON.parse(invoice.addressSnapshot);
      if (snap?.sender && snap?.customer) {
        return {
          creditor: {
            name: snap.sender.name ?? "",
            street: snap.sender.street ?? "",
            street2: snap.sender.street2 ?? "",
            postalCode: snap.sender.zip ?? "",
            town: snap.sender.place ?? "",
            countryCode: snap.sender.country ?? "CH",
          },
          debtor: {
            name: snap.customer.name ?? "",
            street: snap.customer.street ?? "",
            street2: snap.customer.street2 ?? "",
            postalCode: snap.customer.zip ?? "",
            town: snap.customer.place ?? "",
            countryCode: snap.customer.country ?? "CH",
          },
          account: snap.sender.iban || org?.iban || "",
        };
      }
    } catch {
      // malformed snapshot — fall through to live
    }
  }

  const contact = invoice?.contact;
  return {
    creditor: {
      name: (org?.company || `${org?.firstName ?? ""} ${org?.lastName ?? ""}`.trim()) || "",
      street: org?.street || "",
      street2: org?.street2 || "",
      postalCode: org?.zipCode || "",
      town: org?.place || "",
      countryCode: org?.country || "CH",
    },
    debtor: {
      name: contact?.company ?? `${contact?.firstName ?? ""} ${contact?.lastName ?? ""}`.trim(),
      street: contact?.street || "",
      street2: contact?.street2 || "",
      postalCode: contact?.zipCode || "",
      town: contact?.place || "",
      countryCode: contact?.country || "CH",
    },
    account: org?.iban || "",
  };
}

// Server-side QR bill generation using swissqrbill Node.js library
export async function generateQrBill(payload: QrBillPayload): Promise<{ svg?: string; pdfBase64?: string }>{
  const isSwiss = isSwissIban(payload.account);
  try {
    // Dynamically import to avoid issues with browser bundles
    const PDFDocument = (await import("pdfkit")).default;
    const { SwissQRBill } = await import("swissqrbill/pdf");

    // Map payload to swissqrbill data format
    const data: any = {
      currency: payload.currency,
      amount: payload.amount,
      reference: payload.reference,
      creditor: {
        name: payload.creditor.name,
        address: [payload.creditor.street, payload.creditor.street2].filter(Boolean).join(", "),
        zip: parseInt(payload.creditor.postalCode) || 0,
        city: payload.creditor.town,
        account: payload.account,
        country: payload.creditor.countryCode,
      },
      message: payload.message,
      size: 'A6/5', // Compact size to fit on same page
    };

    if (payload.debtor) {
      data.debtor = {
        name: payload.debtor.name,
        address: [payload.debtor.street, payload.debtor.street2].filter(Boolean).join(", "),
        zip: parseInt(payload.debtor.postalCode) || 0,
        city: payload.debtor.town,
        country: payload.debtor.countryCode,
      };
    }

    // Add optional fields if provided
    if (payload.billInformation) {
      data.additionalInformation = payload.billInformation;
    }
    if (payload.language) {
      data.language = payload.language;
    }
    if (payload.lang) {
      const qrLangMap = { en: "EN", de: "DE", fr: "FR", it: "IT" } as const;
      if (qrLangMap[payload.lang]) data.language = qrLangMap[payload.lang];
    }

    const format = payload.graphicsFormat || payload.format?.toUpperCase() || "SVG";

    if (format === "SVG") {
      // QR-bill (SVG) is only available for Swiss/LI IBANs
      if (!isSwiss) {
        return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40"><text x="8" y="26" font-family="sans-serif" font-size="12">Swiss QR-bill requires a Swiss/LI IBAN (CH/LI).</text></svg>` };
      }
      // For SVG generation, use the SVG module
      const { SwissQRBill: SwissQRBillSVG } = await import("swissqrbill/svg");
      const qrBill = new SwissQRBillSVG(data);
      const svg = qrBill.toString();
      return { svg };
    } else if (format === "PDF" || format === "PNG") {
      // For PDF generation with custom positioning matching Swiss letter template
      if (payload.outputSize === "A4_PORTRAIT_SHEET") {
        return await generateCustomInvoicePDF(payload, data, isSwiss);
      }
      
      // Standalone QR-bill (non-sheet output) is only available for Swiss/LI IBANs
      if (!isSwiss) {
        const msg = Buffer.from("Swiss QR-bill requires a Swiss/LI IBAN (CH/LI).", "utf8").toString("base64");
        return { pdfBase64: msg };
      }
      const pdf = new PDFDocument({ 
        size: "A4",
        autoFirstPage: true,
        bufferPages: false
      });
      
      // Create QR bill and attach to PDF
      const qrBill = new SwissQRBill(data);
      qrBill.attachTo(pdf);
      
      // Generate PDF as base64
      return new Promise<{ pdfBase64: string }>((resolve, reject) => {
        const chunks: Buffer[] = [];
        
        pdf.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        pdf.on("end", () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            const pdfBase64 = pdfBuffer.toString("base64");
            resolve({ pdfBase64 });
          } catch (error) {
            reject(error);
          }
        });
        
        pdf.on("error", reject);
        
        // End the PDF stream
        pdf.end();
      });
    }

    return { svg: "<svg><!-- unsupported format --></svg>" };
  } catch (error) {
    console.error("QR bill generation error:", error);
    // Return error details for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    if ((payload.graphicsFormat ?? payload.format ?? "svg").toLowerCase() === "svg") {
      return { svg: `<svg><!-- qr-bill error: ${errorMessage} --></svg>` };
    }
    // For PDF, return error in base64 as a placeholder
    const errorPdf = Buffer.from(`PDF Generation Error: ${errorMessage}`, 'utf8').toString('base64');
    return { pdfBase64: errorPdf };
  }
}

// Custom PDF generator for full invoice with precise Swiss envelope window positioning
async function generateCustomInvoicePDF(payload: QrBillPayload, qrData: any, isSwiss: boolean): Promise<{ pdfBase64: string }> {
  const lang = payload.lang || "en";
  const PDFDocument = (await import("pdfkit")).default;
  const { SwissQRBill } = await import("swissqrbill/pdf");
  
  const pdf = new PDFDocument({ 
    size: "A4",
    autoFirstPage: false, // We'll add the page manually
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    bufferPages: true
  });
  
  // Add a single page manually
  pdf.addPage({size: 'A4', margin: 0});
  
  // A4 dimensions in points (72 points = 1 inch, A4 = 210x297mm)
  const pageWidth = 595.28; // 210mm in points
  const pageHeight = 841.89; // 297mm in points
  
  // Swiss envelope window positioning (matching template - much higher!)
  // Template shows address at approximately 25-27% from top
  const windowLeft = pageWidth * 0.52; // ~52% from left edge (center-right)
  const windowTop = pageHeight * 0.25; // ~25% from top (MUCH HIGHER)
  const windowWidth = 255.12; // 90mm in points
  const windowHeight = 99.21; // 35mm in points
  
  // Helpers to convert mm to points (72 pt/inch, 25.4 mm/inch)
  const mm = (n: number) => (n * 72) / 25.4;

  // QR bill position - fixed at bottom to ensure single page (Swiss QR slip height = 105mm)
  const qrBillHeight = mm(105);
  const qrBillTop = pageHeight - qrBillHeight;
  const maxContentBottom = qrBillTop - 40; // Leave 40pt before QR bill for watermark
  
  // Set consistent Helvetica font
  pdf.font('Helvetica')
     .fontSize(10)
     .fillColor('black');
  
  // Position recipient address in Swiss envelope window area
  let yPosition = windowTop;
  const lineHeight = 11; // Consistent line height
  const leftMargin = windowLeft;
  let addressLineCount = 0;
  const maxAddressLines = 6;
  
  if (payload.debtor) {
    // Recipient name (company or person - required by Swiss Post)
    const recipientName = payload.debtor.name;
    if (recipientName && addressLineCount < maxAddressLines) {
      pdf.text(recipientName, leftMargin, yPosition, { width: windowWidth });
      yPosition += lineHeight;
      addressLineCount++;
    }
    
    // Street address
    if (payload.debtor.street && addressLineCount < maxAddressLines) {
      pdf.text(payload.debtor.street, leftMargin, yPosition, { width: windowWidth });
      yPosition += lineHeight;
      addressLineCount++;
    }
    
    // ZIP + City (Swiss Post format: no comma, space-separated)
    const zipCity = `${payload.debtor.postalCode} ${payload.debtor.town}`;
    if (zipCity.trim() && addressLineCount < maxAddressLines) {
      pdf.text(zipCity, leftMargin, yPosition, { width: windowWidth });
      yPosition += lineHeight;
      addressLineCount++;
    }
    
    // Country (only for non-CH addresses)
    if (payload.debtor.countryCode && 
        payload.debtor.countryCode !== 'CH' && 
        payload.debtor.countryCode !== 'Switzerland' &&
        addressLineCount < maxAddressLines) {
      pdf.text(payload.debtor.countryCode, leftMargin, yPosition, { width: windowWidth });
      addressLineCount++;
    }
  }
  
  // Add sender address in top-left (standard business letter format)
  const senderLeft = 56.69; // 20mm from left
  const senderTop = 56.69; // 20mm from top
  let senderY = senderTop;
  
  pdf.font('Helvetica-Bold')
     .fontSize(11)
     .fillColor('black');
  
  // Sender name/company
  if (payload.creditor.name) {
    pdf.text(payload.creditor.name, senderLeft, senderY);
    senderY += 14;
  }
  
  pdf.font('Helvetica')
     .fontSize(9)
     .fillColor('#666666');
  
  // Sender address (compact)
  if (payload.creditor.street) {
    pdf.text(payload.creditor.street, senderLeft, senderY);
    senderY += 11;
  }
  
  const senderZipCity = `${payload.creditor.postalCode} ${payload.creditor.town}`;
  if (senderZipCity.trim()) {
    pdf.text(senderZipCity, senderLeft, senderY);
    senderY += 11;
  }
  
  if (payload.creditor.countryCode && 
      payload.creditor.countryCode !== 'CH' && 
      payload.creditor.countryCode !== 'Switzerland') {
    pdf.text(payload.creditor.countryCode, senderLeft, senderY);
  }
  
  // Add "INVOICE" title and details in top-right
  pdf.font('Helvetica-Bold')
     .fontSize(16)
     .fillColor('black');
  
  const rightColumn = pageWidth - 180;
  let rightY = senderTop;
  
  pdf.text(t(lang, 'fullpreview.invoice'), rightColumn, rightY, { align: 'right', width: 150 });
  rightY += 24;
  
  pdf.font('Helvetica')
     .fontSize(9)
     .fillColor('#666666');
  
  // Add invoice details (compact)
  if (payload.invoiceData) {
    pdf.text(`${t(lang, 'fullpreview.no')} ${payload.invoiceData.number}`, rightColumn, rightY, { align: 'right', width: 150 });
    rightY += 12;
    
    const issueDate = new Date(payload.invoiceData.issueDate).toLocaleDateString('de-CH');
    pdf.text(`${t(lang, 'fullpreview.date')} ${issueDate}`, rightColumn, rightY, { align: 'right', width: 150 });
    rightY += 12;
    
    if (payload.invoiceData.dueDate) {
      const dueDate = new Date(payload.invoiceData.dueDate).toLocaleDateString('de-CH');
      pdf.text(`${t(lang, 'fullpreview.due')} ${dueDate}`, rightColumn, rightY, { align: 'right', width: 150 });
      rightY += 12;
    }
  }
  
  if (payload.reference) {
    pdf.text(`${t(lang, 'fullpreview.ref')} ${payload.reference}`, rightColumn, rightY, { align: 'right', width: 150 });
  }
  
  // Add invoice items table (very compact to fit on one page)
  let tableY = windowTop + windowHeight + 25;
  
  if (payload.invoiceData && payload.invoiceData.items.length > 0) {
    pdf.font('Helvetica-Bold')
       .fontSize(10)
       .fillColor('black');
    
    pdf.text(t(lang, 'invoice.lineItems'), senderLeft, tableY);
    tableY += 18;
    
    // Table header (very compact)
    pdf.font('Helvetica-Bold')
       .fontSize(7)
       .fillColor('#333333');
    
    const descColX = senderLeft;
    const qtyColX = descColX + 240;
    const priceColX = qtyColX + 50;
    const totalColX = priceColX + 70;
    
    pdf.text(t(lang, 'common.description'), descColX, tableY);
    pdf.text(t(lang, 'fullpreview.qty'), qtyColX, tableY);
    pdf.text(t(lang, 'fullpreview.price'), priceColX, tableY);
    pdf.text(t(lang, 'common.total'), totalColX, tableY);
    
    tableY += 10;
    
    // Draw line under header
    pdf.strokeColor('#cccccc')
       .lineWidth(0.5)
       .moveTo(senderLeft, tableY)
       .lineTo(pageWidth - 50, tableY)
       .stroke();
    
    tableY += 6;
    
    // Table rows (limit to 6 items max, very compact)
    pdf.font('Helvetica')
       .fontSize(7)
       .fillColor('black');
    
    const itemsToShow = payload.invoiceData.items.slice(0, 6);
    itemsToShow.forEach((item) => {
      // Ensure we don't go past the QR bill area
      if (tableY > maxContentBottom - 60) return;
      
      pdf.text(item.description.substring(0, 60), descColX, tableY, { width: 230 });
      pdf.text(item.quantity.toString(), qtyColX, tableY);
      pdf.text(`${item.unitPrice.toFixed(2)}`, priceColX, tableY);
      pdf.text(`${item.lineTotal.toFixed(2)} ${payload.currency}`, totalColX, tableY);
      tableY += 10;
    });
    
    tableY += 6;
    
    // Totals section (very compact)
    const subtotal = payload.invoiceData.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxAmount = payload.invoiceData.totalTax || 0;
    const total = payload.invoiceData.totalGross;
    
    pdf.font('Helvetica')
       .fontSize(8);
    
    const totalsX = pageWidth - 180;
    
    // Only show totals if we have space
    if (tableY < maxContentBottom - 45) {
      pdf.text(`${t(lang, 'preview.subtotal')} ${subtotal.toFixed(2)} ${payload.currency}`, totalsX, tableY, { align: 'right', width: 130 });
      tableY += 10;
      
      if (taxAmount > 0) {
        pdf.text(`${t(lang, 'preview.vat')}: ${taxAmount.toFixed(2)} ${payload.currency}`, totalsX, tableY, { align: 'right', width: 130 });
        tableY += 10;
      }
      
      pdf.font('Helvetica-Bold')
         .fontSize(9);
      pdf.text(`${t(lang, 'preview.total')} ${total.toFixed(2)} ${payload.currency}`, totalsX, tableY, { align: 'right', width: 130 });
      tableY += 15;
    }
  }
  
  // Add facturio.ch watermark before QR bill (free/beta only — PRO is watermark-free)
  if (payload.plan !== "PRO") {
    const watermarkY = qrBillTop - 25;
    pdf.font('Helvetica')
       .fontSize(8)
       .fillColor('#666666');
    
    const centerX = pageWidth / 2;
    pdf.text(`${t(lang, 'preview.createdWithLove')} `, centerX - 110, watermarkY, { continued: true, width: 280 });
    
    pdf.fillColor('#3B82F6') // Blue color for facturio
       .fontSize(9)
       .text('facturio.ch', { link: 'https://facturio.ch' });
  }
  
  // Ensure all subsequent content (QR payment part) uses pure black text/lines
  pdf.fillColor('black').strokeColor('black');
  
  // Create and attach QR bill at fixed position without creating new page
  if (isSwiss) {
    const qrBill = new SwissQRBill(qrData);
    
    // Save current page count
    const pageCountBefore = pdf.bufferedPageRange().count;
    
    // Ensure PDF cursor is at QR bill top (affects SwissQRBill internal space checks)
    pdf.y = qrBillTop;

    // Override addPage temporarily to prevent new pages
    const originalAddPage = pdf.addPage.bind(pdf);
    pdf.addPage = function() {
      console.warn('Prevented automatic page creation by SwissQRBill');
      return this;
    };

    try {
      // Attach QR bill at explicit bottom position (x=0, y=qrBillTop)
      qrBill.attachTo(pdf as any, 0, qrBillTop);
    } finally {
      // Restore original addPage function
      pdf.addPage = originalAddPage;
    }
    
    // Ensure we're still on page 1
    const pageCountAfter = pdf.bufferedPageRange().count;
    if (pageCountAfter > pageCountBefore) {
      console.warn(`Warning: SwissQRBill created ${pageCountAfter - pageCountBefore} additional page(s)`);
    }
  } else {
    // Non-Swiss IBAN: no Swiss QR-bill. Render plain bank transfer details instead.
    const formattedIban = (payload.account || "").replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
    const boxX = 40;
    const boxTop = qrBillTop + 24;
    const boxW = pageWidth - 80;
    const boxH = 100;
    pdf.rect(boxX, boxTop, boxW, boxH).stroke('#999999');
    pdf.font('Helvetica-Bold').fontSize(11).fillColor('black');
    pdf.text('Payment details', boxX + 14, boxTop + 12);
    pdf.font('Helvetica').fontSize(9).fillColor('#333333');
    pdf.text(`Account holder: ${payload.creditor.name}`, boxX + 14, boxTop + 32);
    pdf.text(`IBAN: ${formattedIban}`, boxX + 14, boxTop + 48);
    pdf.text(`Amount: ${Number(payload.amount ?? 0).toFixed(2)} ${payload.currency}`, boxX + 14, boxTop + 64);
    pdf.font('Helvetica').fontSize(8).fillColor('#666666');
    pdf.text('Please transfer the total amount to the account above. (Swiss QR-bill is available for Swiss/LI accounts only.)', boxX + 14, boxTop + 80, { width: boxW - 28 });
  }
  
  // Generate PDF as base64
  return new Promise<{ pdfBase64: string }>((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    pdf.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    pdf.on("end", () => {
      try {
        const pdfBuffer = Buffer.concat(chunks);
        const pdfBase64 = pdfBuffer.toString("base64");
        resolve({ pdfBase64 });
      } catch (error) {
        reject(error);
      }
    });
    
    pdf.on("error", reject);
    
    // End the PDF stream
    pdf.end();
  });
}

