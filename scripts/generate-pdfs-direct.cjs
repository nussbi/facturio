const { PrismaClient } = require("../src/generated/prisma");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { SwissQRBill } = require("swissqrbill/pdf");
const { SwissQRBill: SwissQRBillSVG } = require("swissqrbill/svg");

const prisma = new PrismaClient();

const DOCS_DIR = path.join(process.cwd(), "documents");

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function invCodeFromNumber(n, fallbackId) {
  if (Number.isFinite(n) && n >= 0) {
    const s = String(n).padStart(9, '0');
    return `${s.slice(0,3)}-${s.slice(3,6)}-${s.slice(6,9)}`;
  }
  let h = 0;
  const id = String(fallbackId);
  for (let i = 0; i < id.length; i++) { h = ((h << 5) - h) + id.charCodeAt(i); h |= 0; }
  const num = Math.abs(h) % 1_000_000_000;
  const s = String(num).padStart(9, '0');
  return `${s.slice(0,3)}-${s.slice(3,6)}-${s.slice(6,9)}`;
}

function mapInvoiceToQRBillData(invoice, orgProfile) {
  const contact = invoice.contact;
  
  const data = {
    currency: invoice.currency,
    amount: invoice.totalGross,
    reference: invoice.reference || `INV-${String(invoice.number || 1).padStart(6, '0')}`,
    creditor: {
      name: orgProfile.company,
      address: orgProfile.street,
      zip: parseInt(orgProfile.zipCode) || 0,
      city: orgProfile.place,
      account: orgProfile.iban,
      country: orgProfile.country || "CH",
    },
    message: invoice.message || undefined,
    language: "EN"
  };

  // Add debtor if contact has sufficient info
  if (contact) {
    const debtorName = contact.company || 
      (contact.firstName && contact.lastName ? `${contact.firstName} ${contact.lastName}` : null);
    
    if (debtorName && contact.street && contact.zipCode && contact.place) {
      data.debtor = {
        name: debtorName,
        address: contact.street,
        zip: parseInt(contact.zipCode) || 0,
        city: contact.place,
        country: contact.country || "CH",
      };
    }
  }

  return data;
}

async function generatePDFDirect(qrBillData) {
  return new Promise((resolve, reject) => {
    try {
      const pdf = new PDFDocument({ size: "A4", autoFirstPage: false });
      const qrBill = new SwissQRBill(qrBillData);
      
      const chunks = [];
      pdf.on("data", chunk => chunks.push(chunk));
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", reject);
      
      qrBill.attachTo(pdf);
      pdf.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function generateSVGDirect(qrBillData) {
  try {
    const qrBill = new SwissQRBillSVG(qrBillData);
    return qrBill.toString();
  } catch (error) {
    throw error;
  }
}

async function processInvoiceBatch(invoices, orgProfile, startIndex, batchSize) {
  const results = {
    success: 0,
    errors: 0,
    errorDetails: []
  };

  for (let i = 0; i < invoices.length; i++) {
    const invoice = invoices[i];
    const globalIndex = startIndex + i;
    
    try {
      // Create per-user directory
      const invoiceDir = path.join(DOCS_DIR, "invoices", invoice.userId);
      ensureDirExists(invoiceDir);
      
      // Map invoice data to QR-bill format
      const qrBillData = mapInvoiceToQRBillData(invoice, orgProfile);
      
      // Filename base: invXXX-XXX-XXX
      const code = invCodeFromNumber(invoice.number, invoice.id);
      const base = path.join(invoiceDir, `inv${code}`);
      
      // Generate PDF
      const pdfBuffer = await generatePDFDirect(qrBillData);
      fs.writeFileSync(`${base}.pdf`, pdfBuffer);
      
      // Generate SVG
      const svg = await generateSVGDirect(qrBillData);
      fs.writeFileSync(`${base}.svg`, svg, "utf-8");
      
      results.success++;
      
      // Progress update
      if ((globalIndex + 1) % 500 === 0) {
        console.log(`   ✅ Generated ${globalIndex + 1} PDFs/SVGs...`);
      }
      
    } catch (error) {
      results.errors++;
      results.errorDetails.push({
        invoiceId: invoice.id,
        error: error.message
      });
      
      if (results.errors <= 5) { // Show first 5 errors
        console.warn(`   ⚠️  Error with invoice ${invoice.id}: ${error.message}`);
      }
    }
  }
  
  return results;
}

async function main() {
  console.log("📄 Starting direct PDF generation...");
  
  const adminEmail = "nussbaumer@gmail.com";
  const admin = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!admin) throw new Error(`Admin user not found: ${adminEmail}`);
  const adminId = admin.id;

  // Get organization profile
  const orgProfile = await prisma.orgProfile.findFirst({ where: { userId: adminId } });
  if (!orgProfile) throw new Error("Organization profile not found. Run seed:org first.");

  // Ensure documents directory exists
  const invoicesDir = path.join(DOCS_DIR, "invoices");
  ensureDirExists(invoicesDir);

  // Get total count
  const totalInvoices = await prisma.invoice.count({ where: { userId: adminId } });
  console.log(`📊 Found ${totalInvoices.toLocaleString()} invoices to process`);

  if (totalInvoices === 0) {
    console.log("❌ No invoices found. Run the seeding script first.");
    return;
  }

  // Process in batches to manage memory
  const batchSize = 100;
  const totalBatches = Math.ceil(totalInvoices / batchSize);
  
  let totalSuccess = 0;
  let totalErrors = 0;
  const allErrors = [];
  
  console.log(`🔄 Processing ${totalBatches} batches of ${batchSize} invoices each...`);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const skip = batchIndex * batchSize;
    
    // Fetch batch with related data
    const invoices = await prisma.invoice.findMany({
      where: { userId: adminId },
      include: {
        contact: true,
        items: true
      },
      skip,
      take: batchSize,
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`\n📦 Processing batch ${batchIndex + 1}/${totalBatches} (${invoices.length} invoices)...`);
    
    const batchResults = await processInvoiceBatch(invoices, orgProfile, skip, batchSize);
    
    totalSuccess += batchResults.success;
    totalErrors += batchResults.errors;
    allErrors.push(...batchResults.errorDetails);
    
    // Memory cleanup
    if (global.gc) {
      global.gc();
    }
  }

  // Calculate total file size
  let totalBytes = 0;
  function walkDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDirectory(fullPath);
      } else {
        totalBytes += fs.statSync(fullPath).size;
      }
    }
  }
  walkDirectory(DOCS_DIR);

  console.log("\n📊 Generation Complete!");
  console.log("═════════════════════════");
  console.log(`✅ Successfully generated: ${totalSuccess.toLocaleString()} invoices`);
  console.log(`❌ Errors: ${totalErrors.toLocaleString()}`);
  console.log(`📁 Documents directory: ${DOCS_DIR}`);
  console.log(`💾 Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log("═════════════════════════");

  if (totalErrors > 0 && allErrors.length > 0) {
    console.log(`\n⚠️  First ${Math.min(10, allErrors.length)} errors:`);
    allErrors.slice(0, 10).forEach((error, idx) => {
      console.log(`   ${idx + 1}. Invoice ${error.invoiceId}: ${error.error}`);
    });
  }
}

main()
  .catch(async (e) => {
    console.error("❌ Fatal error:", e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });