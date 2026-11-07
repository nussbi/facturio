import BrandPublicShell from "@/components/BrandPublicShell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <BrandPublicShell>{children}</BrandPublicShell>;
}
