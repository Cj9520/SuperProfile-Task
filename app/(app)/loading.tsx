import { Loader2 } from "lucide-react";

// Shown instantly on navigation while the server layout/page resolves,
// so route transitions never look frozen.
export default function AppLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}
