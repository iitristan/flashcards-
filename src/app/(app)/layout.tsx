import { Sidebar } from "@/components/sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail="student@nutrianki.local" />
      <main className="flex-1 overflow-y-auto bg-background p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
