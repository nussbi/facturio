import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { z } from "zod";

const OrgSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  company: z.string().nullable().optional(),
  street: z.string(),
  street2: z.string().nullable().optional(),
  zipCode: z.string(),
  place: z.string(),
  country: z.string().default("CH"),
  phone: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  iban: z.string(),
  currency: z.enum(["CHF", "EUR"]).default("CHF"),
  defaultVat: z.coerce.number().nullable().optional(),
  vatNumber: z.string().nullable().optional(),
  emailSubject: z.string().nullable().optional(),
  emailBody: z.string().nullable().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const org = await prisma.orgProfile.findFirst({ where: { userId: user.id } });
  return NextResponse.json({ org });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const json = await req.json();
  const parsed = OrgSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data as any;

  // Store fields as provided (trim strings but keep empty strings), and keep defaultVat as number or null
  const clean: any = { ...data };
  for (const k of ["firstName","lastName","company","street","street2","zipCode","place","country","phone","mobile","iban","vatNumber","emailSubject","emailBody"]) {
    if (typeof clean[k] === "string") clean[k] = clean[k].trim();
  }
  if (clean.defaultVat != null && !isNaN(Number(clean.defaultVat))) clean.defaultVat = Number(clean.defaultVat);

  const existing = await prisma.orgProfile.findFirst({ where: { userId: user.id } });

  async function safeUpdateOrCreate(withEmailFields: boolean) {
    const dataObj: any = { ...clean };
    if (!withEmailFields) {
      delete dataObj.emailSubject;
      delete dataObj.emailBody;
    }
    if (existing) {
      return prisma.orgProfile.update({ where: { id: existing.id }, data: dataObj });
    } else {
      if (!user) {
        throw new Error('User not authenticated');
      }
      return prisma.orgProfile.create({ data: { ...dataObj, userId: user.id } });
    }
  }

  let org;
  try {
    org = await safeUpdateOrCreate(true);
  } catch (e) {
    // Fallback for instances where DB schema hasn't been migrated for emailSubject/emailBody yet
    org = await safeUpdateOrCreate(false);
  }
  
  // Mark user profile as completed
  await prisma.user.update({ 
    where: { id: user.id }, 
    data: { profileCompleted: true } 
  });
  
  return NextResponse.json({ org }, { status: 201 });
}

