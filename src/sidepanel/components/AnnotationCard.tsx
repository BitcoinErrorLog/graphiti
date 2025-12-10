import { Annotation } from '../../utils/annotations';

interface AnnotationCardProps {
  annotation: Annotation;
  onHighlight: (annotation: Annotation) => void;
}

function AnnotationCard({ annotation, onHighlight }: AnnotationCardProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClick = () => {
    onHighlight(annotation);
  };

  return (
    <div 
      className="bg-[#1F1F1F] border border-[#3F3F3F] rounded-lg p-4 hover:border-[#667eea] transition-colors cursor-pointer"
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 truncate">
              {annotation.author ? annotation.author.substring(0, 16) + '...' : 'Anonymous'}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(annotation.timestamp)}
            </p>
          </div>
        </div>
      </div>

      {/* Selected Text */}
      <div className="mb-3 bg-[#2A2A2A] border-l-2 border-yellow-500 rounded p-3">
        <p className="text-xs text-gray-500 mb-1">Selected text:</p>
        <p className="text-sm text-gray-300 italic line-clamp-3">
          "{annotation.selectedText}"
        </p>
      </div>

      {/* Comment */}
      <div className="mb-3">
        <p className="text-sm text-white whitespace-pre-wrap">
          {annotation.comment}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          Click to view on page
        </span>
      </div>
    </div>
  );
}

export default AnnotationCard;

