/**
 * @fileoverview Skeleton loader for post cards to improve perceived performance.
 */

import SkeletonLoader from '../../popup/components/SkeletonLoader';

function PostCardSkeleton() {
  return (
    <div className="bg-[#1F1F1F] rounded-xl p-6 border border-[#2F2F2F]">
      {/* Author Header Skeleton */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Avatar Skeleton */}
          <SkeletonLoader width="w-12" height="h-12" rounded="full" />
          
          {/* Name and ID Skeleton */}
          <div className="flex-1 space-y-2">
            <SkeletonLoader width="w-32" height="h-4" />
            <SkeletonLoader width="w-24" height="h-3" />
          </div>
        </div>
        
        {/* Timestamp Skeleton */}
        <SkeletonLoader width="w-12" height="h-4" />
      </div>

      {/* Content Skeleton */}
      <div className="mb-4 space-y-2">
        <SkeletonLoader width="w-full" height="h-4" />
        <SkeletonLoader width="w-full" height="h-4" />
        <SkeletonLoader width="w-3/4" height="h-4" />
      </div>

      {/* Tags Skeleton */}
      <div className="flex flex-wrap gap-2 mb-4">
        <SkeletonLoader width="w-16" height="h-6" rounded="lg" />
        <SkeletonLoader width="w-20" height="h-6" rounded="lg" />
        <SkeletonLoader width="w-14" height="h-6" rounded="lg" />
      </div>

      {/* Action Buttons Skeleton */}
      <div className="flex items-center gap-3 pt-3 border-t border-[#2F2F2F]">
        <SkeletonLoader width="w-12" height="h-5" />
        <SkeletonLoader width="w-12" height="h-5" />
        <div className="flex-1" />
        <SkeletonLoader width="w-16" height="h-5" />
        <SkeletonLoader width="w-5" height="h-5" rounded="lg" />
      </div>
    </div>
  );
}

export default PostCardSkeleton;
