import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { cache } from "react";

function createPrisma(): PrismaClient {
  // 1) Cloudflare Workers (deployed + wrangler dev): D1 via driver adapter.
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare") as typeof import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    return new PrismaClient({ adapter: new PrismaD1((ctx.env as any).DB), log: ["error", "warn"] });
  } catch {
    // 2) VPS / Postgres: plain client (binary engine, generated from schema.postgresql.prisma).
    return new PrismaClient({ log: ["error", "warn"] });
  }
}

// Per-request cache via React's `cache()`: creates ONE client per request.
// A module-level global client is reused across requests in Cloudflare Workers,
// which triggers "Cannot perform I/O on behalf of a different request"
// (I/O objects bound to the first request's context can't be accessed later).
const getPrisma = cache(createPrisma);

// Lazy proxy: client is created on first use within a request, so `next build`'s
// page-data collection can import this module without instantiating Prisma.
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const p = getPrisma();
    const v = (p as any)[prop];
    return typeof v === "function" ? (v as Function).bind(p) : v;
  },
});
