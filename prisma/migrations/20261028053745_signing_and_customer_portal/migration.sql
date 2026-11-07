CREATE TABLE "PortalShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    CONSTRAINT "PortalShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PortalShare_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SigningEnvelope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'OTHER',
    "recipientEmail" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "documentKey" TEXT NOT NULL,
    "signedDocumentKey" TEXT,
    "tokenHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "pageCount" INTEGER NOT NULL,
    "fieldsJson" TEXT NOT NULL,
    "fieldValuesJson" TEXT,
    "extractedDataJson" TEXT,
    "invoiceDraftId" TEXT,
    "signerName" TEXT,
    "signedAt" DATETIME,
    "expiresAt" DATETIME,
    CONSTRAINT "SigningEnvelope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SigningEnvelope_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PortalShare_tokenHash_key" ON "PortalShare"("tokenHash");
CREATE INDEX "PortalShare_userId_contactId_idx" ON "PortalShare"("userId", "contactId");
CREATE INDEX "PortalShare_expiresAt_idx" ON "PortalShare"("expiresAt");
CREATE UNIQUE INDEX "SigningEnvelope_tokenHash_key" ON "SigningEnvelope"("tokenHash");
CREATE UNIQUE INDEX "SigningEnvelope_invoiceDraftId_key" ON "SigningEnvelope"("invoiceDraftId");
CREATE INDEX "SigningEnvelope_userId_status_idx" ON "SigningEnvelope"("userId", "status");
CREATE INDEX "SigningEnvelope_contactId_idx" ON "SigningEnvelope"("contactId");
CREATE INDEX "SigningEnvelope_expiresAt_idx" ON "SigningEnvelope"("expiresAt");
