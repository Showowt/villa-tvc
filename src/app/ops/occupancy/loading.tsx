import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default function OccupancyLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <LoadingSkeleton variant="stats" />
      <LoadingSkeleton variant="table" count={8} />
    </div>
  );
}
