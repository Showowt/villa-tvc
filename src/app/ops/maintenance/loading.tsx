import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default function MaintenanceLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <LoadingSkeleton variant="stats" />
      <LoadingSkeleton variant="card" count={4} />
    </div>
  );
}
