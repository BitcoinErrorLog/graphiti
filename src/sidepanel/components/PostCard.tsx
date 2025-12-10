import { NexusPost } from '../../utils/nexus-client';
import { getTagStyle } from '../../utils/tag-colors';

interface PostCardProps {
  post: NexusPost;
}

function PostCard({ post }: PostCardProps) {
  // Handle nested details structure from Nexus
  const details = post.details || {
    id: post.id || '',
    author: post.author_id || '',
    content: post.content || '',
    kind: post.kind || 'short',
    uri: post.uri || '',
    indexed_at: post.indexed_at || 0,
    attachments: post.attachments || []
  };

  // Get avatar image URL from Nexus
  const getAvatarUrl = (authorId: string): string => {
    // Clean up author ID (remove pubky:// prefix if present)
    const cleanId = authorId.replace('pubky://', '').split('/')[0];
    // Nexus serves avatars at /static/avatar/{user_id}
    return `https://nexus.pubky.app/static/avatar/${cleanId}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}M`;
    if (diffHours < 24) return `${diffHours}H`;
    if (diffDays < 7) return `${diffDays}D`;
    return date.toLocaleDateString();
  };

  const formatAuthorId = (authorId: string) => {
    // Format as PK:XXXX...XXXX
    if (authorId.startsWith('pubky://')) {
      authorId = authorId.replace('pubky://', '').split('/')[0];
    }
    if (authorId.length <= 12) return `PK:${authorId}`;
    return `PK:${authorId.substring(0, 4)}...${authorId.substring(authorId.length - 4)}`;
  };

  const formatPostId = (id: string) => {
    if (id.length <= 12) return id;
    return id.substring(0, 12).toUpperCase();
  };

  const renderContentWithLinks = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="bg-[#1F1F1F] rounded-xl p-6 hover:bg-[#252525] transition-all duration-200 border border-[#2F2F2F] animate-fade-in">
      {/* Author Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar - Always try to load from Nexus, fallback to gradient on error */}
          <img 
            src={getAvatarUrl(details.author)} 
            alt={post.author?.name || details.author} 
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            onError={(e) => {
              // Hide the image and show the gradient fallback
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextSibling) {
                (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
          <div 
            className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0 hidden"
          >
            {post.author?.name?.[0]?.toUpperCase() || details.author.substring(0, 1).toUpperCase()}
          </div>
          
          {/* Name and ID */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="font-semibold text-white text-base truncate">
                {post.author?.name || 'Anonymous'}
              </h3>
              <span className="text-gray-500 text-sm font-mono">
                {formatAuthorId(details.author)}
              </span>
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-gray-500 text-sm ml-2 flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatDate(details.indexed_at)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-white text-base leading-relaxed whitespace-pre-wrap break-words">
          {renderContentWithLinks(details.content)}
        </p>
      </div>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.slice(0, 3).map((tag, idx) => {
            const tagStyle = getTagStyle(tag.label);
            return (
              <button
                key={idx}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: tagStyle.backgroundColor,
                  color: tagStyle.color
                }}
                aria-label={`Tag: ${tag.label}`}
              >
                {tag.label}
                {tag.taggers_count > 1 && (
                  <span className="opacity-75">{tag.taggers_count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Attachments/URLs */}
      {details.attachments && details.attachments.length > 0 && (
        <div className="space-y-2 mb-4">
          {details.attachments.map((attachment, idx) => (
            <a
              key={idx}
              href={attachment}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#2A2A2A] hover:bg-[#333333] border border-[#3F3F3F] rounded-lg p-3 transition-colors"
            >
              <p className="text-blue-400 text-sm break-all hover:underline">
                {attachment}
              </p>
            </a>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-3 border-t border-[#2F2F2F]">
        {/* Tag Count */}
        {post.counts?.tags ? (
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded" aria-label={`${post.counts.tags} tags`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="text-sm">{post.counts.tags}</span>
          </button>
        ) : null}

        {/* Reply Count */}
        {post.counts?.replies ? (
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded" aria-label={`${post.counts.replies} replies`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm">{post.counts.replies}</span>
          </button>
        ) : null}

        {/* Repost Count */}
        {post.counts?.reposts ? (
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-green-400 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded" aria-label={`${post.counts.reposts} reposts`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-sm">{post.counts.reposts}</span>
          </button>
        ) : null}

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* View on Pubky */}
        <a
          href={details.uri}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-gray-300 transition-colors text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          title="View on Pubky"
          aria-label="View post on Pubky"
        >
          {formatPostId(details.id)}
        </a>

        {/* More Menu */}
        <button className="text-gray-400 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-gray-500" aria-label="More options">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default PostCard;

