import { cookies, headers } from "next/headers";
import { getCurrentUser } from "@/server/auth";
import { prisma } from "@/server/db";
const { GUEST_COOKIE, guestDraftIds, canManageEnvelope } = require("@/lib/signing-flow.cjs");
export async function getManagedSigningEnvelope(id: string) {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return null;
  const user = await getCurrentUser();
  const ids = guestDraftIds((await cookies()).get(GUEST_COOKIE)?.value, process.env.SECRET_KEY);
  const envelope = await prisma.signingEnvelope.findUnique({ where: { id } });
  return canManageEnvelope(envelope, user?.id, ids) ? envelope : null;
}
export async function isStandaloneSigningHost() {
  const host = ((await headers()).get("host") || "").split(":")[0];
  return host === "sign.facturio.ch" || host === "staging.sign.facturio.ch" || (process.env.NODE_ENV !== "production" && (host === "localhost" || host === "127.0.0.1"));
}
