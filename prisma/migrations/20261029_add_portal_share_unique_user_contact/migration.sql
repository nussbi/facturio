-- Add unique constraint on userId + contactId for PortalShare
DROP INDEX IF EXISTS "PortalShare_userId_contactId_idx";
CREATE UNIQUE INDEX "PortalShare_userId_contactId_key" ON "PortalShare"("userId", "contactId");
