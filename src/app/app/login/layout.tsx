export default function LoginLayout({ children }: { children: React.ReactNode }) {
  // Providers (language + toast) are already applied by app/app/layout.tsx.
  // Nesting a second copy here caused duplicate context providers and a
  // client-side exception during hydration. This layout is a pure passthrough.
  return <>{children}</>;
}
