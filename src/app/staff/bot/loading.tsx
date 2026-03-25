import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default function BotLoading() {
  return (
    <div className="space-y-4 animate-fade-in p-4">
      <LoadingSkeleton variant="chat" count={3} />
    </div>
  );
}
