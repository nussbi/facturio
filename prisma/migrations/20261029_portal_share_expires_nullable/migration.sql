-- Make expiresAt nullable in PortalShare by recreating the table
CREATE TABLE "PortalShare_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    CONSTRAINT "PortalShare_new_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PortalShare_new_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "PortalShare_new" ("id", "createdAt", "userId", "contactId", "tokenHash", "expiresAt", "revokedAt")
SELECT "id", "createdAt", "userId", "contactId", "tokenHash", "expiresAt", "revokedAt" FROM "PortalShare";

DROP TABLE "PortalShare";

ALTER TABLE "PortalShare_new" RENAME TO "PortalShare";

CREATE UNIQUE INDEX "PortalShare_tokenHash_key" ON "PortalShare"("tokenHash");
CREATE UNIQUE INDEX "PortalShare_userId_contactId_key" ON "PortalShare"("userId", "contactId");
CREATE INDEX "PortalShare_expiresAt_idx" ON "PortalShare"("expiresAt");
