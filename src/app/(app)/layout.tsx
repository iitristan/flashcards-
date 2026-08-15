import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email;
  } catch (e) {
    console.warn("Supabase layout auth skipped:", e);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="flex-1 overflow-y-auto bg-background p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
