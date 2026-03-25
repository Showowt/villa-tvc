import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default function RevenueLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <LoadingSkeleton variant="stats" />
      <LoadingSkeleton variant="table" count={6} />
    </div>
  );
}
