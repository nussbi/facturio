import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

const ExpenseSchema = z.object({
  type: z.enum(["TIME", "ITEM"]),
  title: z.string().optional(),
  description: z.string(),
  date: z.coerce.date().optional(),
  quantity: z.coerce.number().nonnegative(),
  unit: z.string(),
  unitPrice: z.coerce.number().nonnegative(),
  currency: z.enum(["CHF", "EUR"]).default("CHF"),
  contactId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId") || undefined;
  const currency = searchParams.get("currency") || undefined;
  const q = (searchParams.get("q") || "").trim();
  const where: any = { userId: user.id };
  if (contactId) where.contactId = contactId;
  if (currency) where.currency = currency as any;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }
  const expenses = await prisma.expense.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = ExpenseSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const expense = await prisma.expense.create({
    data: {
      userId: user.id,
      type: data.type,
      title: data.title,
      description: data.description,
      date: data.date ?? new Date(),
      quantity: data.quantity,
      unit: data.unit,
      unitPrice: data.unitPrice,
      currency: data.currency,
      contactId: data.contactId,
    },
  });
  return NextResponse.json({ expense }, { status: 201 });
}

