/**
 * @fileoverview Loading state component for sidepanel.
 */

interface LoadingStateProps {
  /** Custom message */
  message?: string;
}

function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin mb-4" />
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}

export default LoadingState;

