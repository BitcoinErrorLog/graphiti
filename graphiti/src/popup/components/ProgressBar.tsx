/**
 * @fileoverview Progress bar component for showing upload/download progress.
 */

interface ProgressBarProps {
  /** Progress value (0-100) */
  progress: number;
  /** Optional label text */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

function ProgressBar({ progress, label, className = '' }: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">{label}</span>
          <span className="text-sm text-gray-400 font-mono">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className="w-full bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || 'Progress'}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
