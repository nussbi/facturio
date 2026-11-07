import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

const PatchSchema = z.object({
  company: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  street: z.string().optional(),
  street2: z.string().optional(),
  zipCode: z.string().optional(),
  place: z.string().optional(),
  telephoneFix: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional(),
  country: z.string().optional(),
  currency: z.enum(["CHF", "EUR"]).optional(),
  iban: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const contact = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!contact) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ contact });
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const json = await _req.json();
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data as any;

  const existing = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (data.iban) {
    const { validateIban } = await import("@/lib/iban");
    const res = validateIban(data.iban);
    if (!res.valid) return NextResponse.json({ error: { iban: res.error || "Invalid IBAN" } }, { status: 400 });
    data.iban = res.normalized;
  }

  const updated = await prisma.contact.update({ where: { id }, data });

  const changed: string[] = [];
  const label: Record<string, string> = {
    company: "company",
    firstName: "first name",
    lastName: "last name",
    street: "street",
    street2: "street 2",
    zipCode: "zip",
    place: "place",
    telephoneFix: "telephone",
    mobile: "mobile",
    email: "email",
    country: "country",
    currency: "currency",
    iban: "IBAN",
  };
  for (const k of Object.keys(data)) {
    if ((existing as any)[k] !== (updated as any)[k]) changed.push(label[k] || k);
  }
  if (changed.length) {
    await prisma.contactLog.create({ data: { contactId: id, message: `Changed: ${changed.join(", ")}` } });
  }
  return NextResponse.json({ contact: updated });
}

