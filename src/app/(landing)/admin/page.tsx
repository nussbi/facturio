import AdminPanel from "./AdminPanel";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  const isAdmin = !!user && (user.role === "ADMIN" || user.email === "nussbaumer@gmail.com");
  if (!isAdmin) redirect("/");
  return <AdminPanel />;
}
