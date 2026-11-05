import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/server/db";

export const SESSION_COOKIE = "tellbill_session";

function getSecret() {
  return process.env.SECRET_KEY || "dev-secret-change-me";
}

export async function hashPassword(password: string, salt?: string) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = await new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, s, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString("hex"));
    });
  });
  return `${s}:${hash}`;
}

export async function verifyPassword(password: string, passwordHash: string | null) {
  if (!passwordHash) return false;
  const [salt, hash] = passwordHash.split(":");
  const verify = await hashPassword(password, salt);
  return verify === passwordHash;
}

export function signSession(payload: Record<string, unknown>) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
  return `${data}.${hmac}`;
}

export function verifySession(token: string | undefined | null) {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try { return JSON.parse(Buffer.from(data, "base64url").toString("utf8")); } catch { return null; }
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session?.userId) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  return user;
}

export async function setSession(res: Response, user: { id: string; email: string; role: string }) {
  const token = signSession({ userId: user.id, email: user.email, role: user.role, iat: Date.now() });
  setSessionToken(res, token);
}

export function setSessionToken(res: Response, token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.headers.set("Set-Cookie", `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${60*60*24*30}`);
}

export function clearSession(res: Response) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.headers.set("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`);
}
