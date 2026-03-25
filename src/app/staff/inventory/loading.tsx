import {
  Skeleton,
  SkeletonInventoryItem,
} from "@/components/ui/LoadingSkeleton";

export default function InventoryLoading() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-28 mb-1" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="flex-shrink-0 h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Ingredients List */}
      <div className="space-y-2">
        <SkeletonInventoryItem />
        <SkeletonInventoryItem />
        <SkeletonInventoryItem />
        <SkeletonInventoryItem />
        <SkeletonInventoryItem />
        <SkeletonInventoryItem />
      </div>

      {/* Summary Footer placeholder */}
      <div className="h-14" />
    </div>
  );
}
