/**
 * @fileoverview Skeleton loader component with shimmer animation for better perceived performance.
 */

interface SkeletonLoaderProps {
  /** Width of the skeleton (e.g., 'w-full', 'w-32', 'w-1/2') */
  width?: string;
  /** Height of the skeleton (e.g., 'h-4', 'h-8', 'h-12') */
  height?: string;
  /** Additional CSS classes */
  className?: string;
  /** Rounded corners (default: 'rounded') */
  rounded?: 'none' | 'sm' | 'rounded' | 'lg' | 'full';
}

function SkeletonLoader({ 
  width = 'w-full', 
  height = 'h-4', 
  className = '',
  rounded = 'rounded'
}: SkeletonLoaderProps) {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    rounded: 'rounded',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  return (
    <div
      className={`${width} ${height} ${roundedClasses[rounded]} bg-[#2A2A2A] animate-pulse ${className}`}
      role="status"
      aria-label="Loading"
      aria-live="polite"
    >
      <div className="h-full w-full bg-gradient-to-r from-[#2A2A2A] via-[#333333] to-[#2A2A2A] bg-[length:200%_100%]" style={{ animation: 'shimmer 1.5s ease-in-out infinite' }} />
    </div>
  );
}

export default SkeletonLoader;
