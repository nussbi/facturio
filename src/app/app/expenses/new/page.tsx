import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { SimpleExpenseForm } from "@/components/SimpleExpenseForm";
import { getServerT } from "@/lib/i18n-server";

export default async function NewExpensePage() {
  const t = await getServerT();
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!(user as any).profileCompleted) redirect('/onboarding');
  
  const contacts = await prisma.contact.findMany({ 
    where: { userId: user.id }, 
    orderBy: { createdAt: "asc" } 
  });
  
  const contactOptions = contacts.map(c => ({ 
    id: c.id, 
    name: c.company || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email 
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("expenses.addExpense")}</h1>
        <p className="text-muted-foreground mt-1">{t("expenses.trackHint")}</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t("expenses.details")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleExpenseForm contacts={contactOptions} />
        </CardContent>
      </Card>
    </div>
  );
}
