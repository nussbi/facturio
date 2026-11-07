import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

const ContactSchema = z.object({
  company: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  street: z.string(),
  street2: z.string().optional(),
  zipCode: z.string(),
  place: z.string(),
  telephoneFix: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email(),
  country: z.string().default("CH"),
  currency: z.enum(["CHF", "EUR"]).default("CHF"),
  iban: z.string().min(1, "IBAN is required"),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const contacts = await prisma.contact.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let json: any;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON body" } }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data as any;

  // Trim strings
  for (const k of ["company","firstName","lastName","street","street2","zipCode","place","telephoneFix","mobile","email","country","iban"]) {
    if (typeof data[k] === "string") data[k] = data[k].trim();
  }
  data.userId = user.id;

  // Prevent duplicate companies per user
  if (data.company) {
    const existing = await prisma.contact.findFirst({ where: { userId: user.id, company: data.company } });
    if (existing) {
      return NextResponse.json({ error: { company: "A company with this name already exists" }, existingId: existing.id }, { status: 409 });
    }
  }

  // IBAN validation (CH/DE/AT/LI)
  if (data.iban) {
    const { validateIban } = await import("@/lib/iban");
    const res = validateIban(data.iban);
    if (!res.valid) {
      return NextResponse.json({ error: { iban: res.error || "Invalid IBAN" } }, { status: 400 });
    }
    data.iban = res.normalized;
  }

  try {
    const contact = await prisma.contact.create({ data });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || "Database error";
    return NextResponse.json({ error: { message: msg } }, { status: 500 });
  }
}

