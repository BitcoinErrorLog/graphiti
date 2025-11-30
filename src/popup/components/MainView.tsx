import { useState, useEffect } from 'react';
import { Session, storage } from '../../utils/storage';
import { logger } from '../../utils/logger';
import { getTagStyle } from '../../utils/tag-colors';

interface MainViewProps {
  session: Session;
  currentUrl: string;
  currentTitle: string;
  onSignOut: () => void;
  onBookmark: () => void;
  onPost: (content: string, tags: string[]) => void;
  onOpenSidePanel: () => void;
  onEditProfile: () => void;
}

function MainView({
  session,
  currentUrl,
  currentTitle,
  onSignOut,
  onBookmark,
  onPost,
  onOpenSidePanel,
  onEditProfile,
}: MainViewProps) {
  const [postContent, setPostContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const MAX_CONTENT_LENGTH = 1000;

  useEffect(() => {
    loadExistingData();
  }, [currentUrl]);

  const loadExistingData = async () => {
    try {
      // Check if bookmarked
      const bookmarked = await storage.isBookmarked(currentUrl);
      setIsBookmarked(bookmarked);

      // Load existing tags
      const tags = await storage.getTagsForUrl(currentUrl);
      setExistingTags(tags);
      
      logger.debug('MainView', 'Loaded existing data', { bookmarked, tags });
    } catch (error) {
      logger.error('MainView', 'Failed to load existing data', error as Error);
    }
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Must have either content or tags
    if (!postContent.trim() && !tagInput.trim()) {
      alert('Please enter post content or tags');
      return;
    }

    // Parse tags (comma or space separated)
    const tags = tagInput
      .split(/[,\s]+/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0 && t.length <= 20);

    if (tagInput.trim() && tags.length === 0) {
      alert('Please enter valid tags (max 20 characters each)');
      return;
    }

    onPost(postContent, tags);
    setPostContent('');
    setTagInput('');
    
    // Update existing tags
    if (tags.length > 0) {
      setExistingTags(prev => [...new Set([...prev, ...tags])]);
    }
  };

  const handleBookmarkClick = async () => {
    await onBookmark();
    setIsBookmarked(!isBookmarked);
  };

  const handleDrawingToggle = async () => {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        logger.error('MainView', 'No active tab found');
        alert('No active tab found');
        return;
      }

      // Check if this is a valid page for content scripts
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://'))) {
        alert('Drawing mode is not available on this page. Try a regular website.');
        return;
      }

      // Send message to content script to toggle drawing mode
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DRAWING_MODE' }, (response) => {
        if (chrome.runtime.lastError) {
          logger.error('MainView', 'Failed to toggle drawing mode', new Error(chrome.runtime.lastError.message));
          alert('Please refresh the page first, then try activating drawing mode again.');
        } else {
          logger.info('MainView', 'Drawing mode toggled', { active: response?.active });
          // Close popup so user can see the drawing canvas
          window.close();
        }
      });
    } catch (error) {
      logger.error('MainView', 'Failed to toggle drawing mode', error as Error);
      alert('Failed to activate drawing mode. Try refreshing the page.');
    }
  };

  const truncate = (str: string, maxLen: number) => {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '...';
  };

  // Format pubky for display
  const formatPubky = (pubky: string) => {
    if (pubky.length <= 16) return pubky;
    return `${pubky.substring(0, 8)}...${pubky.substring(pubky.length - 8)}`;
  };

  return (
    <div className="space-y-3">
      {/* User Info */}
      <div className="bg-[#1F1F1F] border border-[#3F3F3F] rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">Signed in as</p>
            <p className="font-mono text-sm text-white truncate" title={session.pubky}>
              {formatPubky(session.pubky)}
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="px-3 py-1 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition ml-2 flex-shrink-0"
          >
            Sign Out
          </button>
        </div>
        <button
          onClick={onEditProfile}
          className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium rounded-lg transition flex items-center justify-center"
        >
          <span className="mr-2">✏️</span>
          Edit Profile
        </button>
      </div>

      {/* Current Page */}
      <div className="bg-[#1F1F1F] border border-[#3F3F3F] rounded-lg p-3">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Current Page</h3>
        <p className="text-sm font-medium text-white mb-1">
          {truncate(currentTitle, 50)}
        </p>
        <p className="text-xs text-gray-500 break-all">
          {truncate(currentUrl, 60)}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#1F1F1F] border border-[#3F3F3F] rounded-lg p-3">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Quick Actions</h3>
        
        <div className="space-y-2">
          {/* Bookmark */}
          <button
            onClick={handleBookmarkClick}
            className={`w-full px-4 py-2 rounded-lg font-medium transition flex items-center justify-center text-sm ${
              isBookmarked
                ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50 border border-yellow-700/50'
                : 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-700/50'
            }`}
          >
            <span className="mr-2">{isBookmarked ? '⭐' : '☆'}</span>
            {isBookmarked ? 'Bookmarked' : 'Bookmark Page'}
          </button>

          {/* Drawing Mode */}
          <button
            onClick={handleDrawingToggle}
            className="w-full px-4 py-2 bg-pink-900/30 text-pink-400 hover:bg-pink-900/50 border border-pink-700/50 rounded-lg font-medium transition flex items-center justify-center text-sm"
          >
            <span className="mr-2">🎨</span>
            Drawing Mode
          </button>

          {/* View Feed */}
          <button
            onClick={onOpenSidePanel}
            className="w-full px-4 py-2 bg-purple-900/30 text-purple-400 hover:bg-purple-900/50 border border-purple-700/50 rounded-lg font-medium transition flex items-center justify-center text-sm"
          >
            <span className="mr-2">📱</span>
            View Feed
          </button>
        </div>
      </div>

      {/* Create Post */}
      <div className="bg-[#1F1F1F] border border-[#3F3F3F] rounded-lg p-3">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Create Post</h3>
        
        {existingTags.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">Existing tags:</p>
            <div className="flex flex-wrap gap-2">
              {existingTags.map((tag) => {
                const tagStyle = getTagStyle(tag);
                return (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs rounded-lg"
                    style={{
                      backgroundColor: tagStyle.backgroundColor,
                      color: tagStyle.color
                    }}
                  >
                    #{tag}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={handlePostSubmit} className="space-y-2">
          {/* Post Content */}
          <div>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
              placeholder="What's on your mind? (optional)"
              className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3F3F3F] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              maxLength={MAX_CONTENT_LENGTH}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">
                URL will be added automatically
              </p>
              <span className={`text-xs ${postContent.length > MAX_CONTENT_LENGTH * 0.9 ? 'text-yellow-500' : 'text-gray-500'}`}>
                {postContent.length}/{MAX_CONTENT_LENGTH}
              </span>
            </div>
          </div>

          {/* Tags */}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Tags (comma or space separated)"
            className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3F3F3F] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={100}
          />
          
          <button
            type="submit"
            disabled={!postContent.trim() && !tagInput.trim()}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {postContent.trim() ? 'Create Post' : 'Tag URL'}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-2">
          Posts are published to your Pubky homeserver and tagged for discovery.
        </p>
      </div>
    </div>
  );
}

export default MainView;

