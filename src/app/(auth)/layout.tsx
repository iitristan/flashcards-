import { Brain } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="mb-8 flex items-center gap-2">
        <Brain className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold tracking-tight">FlashMind</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
