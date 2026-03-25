import { Skeleton, SkeletonChecklistItem } from "@/components/ui/LoadingSkeleton";

export default function ChecklistLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="space-y-4">
        {/* Department group */}
        <div>
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="space-y-3">
            <SkeletonChecklistItem />
            <SkeletonChecklistItem />
          </div>
        </div>

        <div>
          <Skeleton className="h-4 w-28 mb-3" />
          <div className="space-y-3">
            <SkeletonChecklistItem />
            <SkeletonChecklistItem />
          </div>
        </div>
      </div>
    </div>
  );
}
