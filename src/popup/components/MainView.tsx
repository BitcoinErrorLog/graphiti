import { useState, useEffect } from 'react';
import { Session, storage } from '../../utils/storage';
import { logger } from '../../utils/logger';
import { getTagStyle } from '../../utils/tag-colors';
import SyncStatus from './SyncStatus';
import { parseAndValidateTags, validatePostContent, VALIDATION_LIMITS } from '../../utils/validation';
import LoadingSpinner from './LoadingSpinner';
import SkeletonLoader from './SkeletonLoader';
import { toastManager } from '../../utils/toast';

interface MainViewProps {
  session: Session;
  currentUrl: string;
  currentTitle: string;
  onSignOut: () => void;
  onBookmark: (category?: string) => void;
  onPost: (content: string, tags: string[]) => void;
  onOpenSidePanel: () => void;
  onEditProfile: () => void;
  onManageStorage: () => void;
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
  onManageStorage,
}: MainViewProps) {
  const [postContent, setPostContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [bookmarkCategory, setBookmarkCategory] = useState('');

  const MAX_CONTENT_LENGTH = VALIDATION_LIMITS.POST_CONTENT_MAX_LENGTH;

  useEffect(() => {
    loadExistingData();
  }, [currentUrl]);

  const loadExistingData = async () => {
    try {
      setIsLoadingData(true);
      // Check if bookmarked
      const bookmarked = await storage.isBookmarked(currentUrl);
      setIsBookmarked(bookmarked);

      // Load existing tags
      const tags = await storage.getTagsForUrl(currentUrl);
      setExistingTags(tags);
      
      logger.debug('MainView', 'Loaded existing data', { bookmarked, tags });
    } catch (error) {
      logger.error('MainView', 'Failed to load existing data', error as Error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const region = document.getElementById('aria-live-region');
    if (region) {
      region.setAttribute('aria-live', priority);
      region.textContent = message;
      // Clear after announcement to allow re-announcement
      setTimeout(() => {
        region.textContent = '';
      }, 1000);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isPosting) return; // Prevent double submission
    
    // Must have either content or tags
    if (!postContent.trim() && !tagInput.trim()) {
      toastManager.warning('Please enter post content or tags');
      announceToScreenReader('Please enter post content or tags', 'assertive');
      return;
    }

    // Validate post content using centralized validation
    const contentValidation = validatePostContent(postContent, false);
    if (!contentValidation.valid) {
      toastManager.error(contentValidation.error || 'Invalid post content');
      announceToScreenReader(contentValidation.error || 'Invalid post content', 'assertive');
      return;
    }

    // Parse and validate tags using centralized validation
    const tagValidation = parseAndValidateTags(tagInput);
    if (!tagValidation.valid) {
      toastManager.error(tagValidation.error || 'Invalid tags');
      announceToScreenReader(tagValidation.error || 'Invalid tags', 'assertive');
      return;
    }

    const validatedTags = tagValidation.sanitizedTags || [];

    if (tagInput.trim() && validatedTags.length === 0) {
      toastManager.warning(`Please enter valid tags (letters, numbers, hyphens, underscores; max ${VALIDATION_LIMITS.TAG_MAX_LENGTH} characters each)`);
      announceToScreenReader('Please enter valid tags', 'assertive');
      return;
    }

    try {
      setIsPosting(true);
      announceToScreenReader('Posting...');
      await onPost(contentValidation.sanitized || postContent, validatedTags);
      setPostContent('');
      setTagInput('');
      
      // Update existing tags
      if (validatedTags.length > 0) {
        setExistingTags(prev => [...new Set([...prev, ...validatedTags])]);
      }
      announceToScreenReader('Post created successfully');
    } catch (error) {
      logger.error('MainView', 'Failed to create post', error as Error);
      announceToScreenReader('Failed to create post', 'assertive');
    } finally {
      setIsPosting(false);
    }
  };

  const handleBookmarkClick = async () => {
    if (isBookmarking) return; // Prevent double click
    
    // If not bookmarked, show category input
    if (!isBookmarked) {
      setShowCategoryInput(true);
      return;
    }
    
    // If already bookmarked, remove it
    try {
      setIsBookmarking(true);
      announceToScreenReader('Processing bookmark...');
      await onBookmark();
      setIsBookmarked(false);
      setBookmarkCategory('');
      announceToScreenReader('Bookmark removed');
    } catch (error) {
      logger.error('MainView', 'Failed to remove bookmark', error as Error);
      announceToScreenReader('Failed to remove bookmark', 'assertive');
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleCategorySubmit = async () => {
    if (isBookmarking) return;
    
    try {
      setIsBookmarking(true);
      setShowCategoryInput(false);
      announceToScreenReader('Processing bookmark...');
      await onBookmark(bookmarkCategory.trim() || undefined);
      setIsBookmarked(true);
      announceToScreenReader('Page bookmarked');
    } catch (error) {
      logger.error('MainView', 'Failed to create bookmark', error as Error);
      announceToScreenReader('Failed to create bookmark', 'assertive');
      setShowCategoryInput(true); // Show input again on error
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleDrawingToggle = async () => {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        logger.error('MainView', 'No active tab found');
        toastManager.error('No active tab found');
        return;
      }

      // Check if this is a valid page for content scripts
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://'))) {
        toastManager.warning('Drawing mode is not available on this page. Try a regular website.');
        return;
      }

      // Send message to content script to toggle drawing mode
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DRAWING_MODE' }, (response) => {
        if (chrome.runtime.lastError) {
          logger.error('MainView', 'Failed to toggle drawing mode', new Error(chrome.runtime.lastError.message));
          toastManager.warning('Please refresh the page first, then try activating drawing mode again.');
        } else {
          logger.info('MainView', 'Drawing mode toggled', { active: response?.active });
          // Close popup so user can see the drawing canvas
          window.close();
        }
      });
    } catch (error) {
      logger.error('MainView', 'Failed to toggle drawing mode', error as Error);
      toastManager.error('Failed to activate drawing mode. Try refreshing the page.');
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
            className="px-3 py-1 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition ml-2 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Sign out of your account"
          >
            Sign Out
          </button>
        </div>
        <button
          onClick={onEditProfile}
          className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium rounded-lg transition flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Edit your profile"
        >
          <span className="mr-2">✏️</span>
          Edit Profile
        </button>
      </div>

      {/* Sync Status */}
      <SyncStatus />

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
          {showCategoryInput && !isBookmarked ? (
            <div className="space-y-2">
              <input
                type="text"
                value={bookmarkCategory}
                onChange={(e) => setBookmarkCategory(e.target.value)}
                placeholder="Category (optional)"
                className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3F3F3F] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={50}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCategorySubmit();
                  } else if (e.key === 'Escape') {
                    setShowCategoryInput(false);
                    setBookmarkCategory('');
                  }
                }}
                autoFocus
                aria-label="Bookmark category"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCategorySubmit}
                  disabled={isBookmarking}
                  className="flex-1 px-4 py-2 bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-700/50 rounded-lg font-medium transition-all duration-150 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Save bookmark"
                >
                  {isBookmarking ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setShowCategoryInput(false);
                    setBookmarkCategory('');
                  }}
                  disabled={isBookmarking}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-150 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 active:scale-95 disabled:opacity-50"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleBookmarkClick}
              disabled={isBookmarking || isLoadingData}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-150 flex items-center justify-center text-sm focus:outline-none focus:ring-2 active:scale-95 ${
                isBookmarked
                  ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50 border border-yellow-700/50 focus:ring-yellow-500'
                  : 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-700/50 focus:ring-blue-500'
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
              aria-pressed={isBookmarked}
            >
              {isBookmarking ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span className="mr-2">{isBookmarked ? '⭐' : '☆'}</span>
                  {isBookmarked ? 'Bookmarked' : 'Bookmark Page'}
                </>
              )}
            </button>
          )}

          {/* Drawing Mode */}
          <button
            onClick={handleDrawingToggle}
            className="w-full px-4 py-2 bg-pink-900/30 text-pink-400 hover:bg-pink-900/50 border border-pink-700/50 rounded-lg font-medium transition-all duration-150 flex items-center justify-center text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 active:scale-95"
            aria-label="Toggle drawing mode on current page"
          >
            <span className="mr-2">🎨</span>
            Drawing Mode
          </button>

          {/* View Feed */}
          <button
            onClick={onOpenSidePanel}
            className="w-full px-4 py-2 bg-purple-900/30 text-purple-400 hover:bg-purple-900/50 border border-purple-700/50 rounded-lg font-medium transition-all duration-150 flex items-center justify-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 active:scale-95"
            aria-label="Open feed sidebar to view posts and annotations"
          >
            <span className="mr-2">📱</span>
            View Feed
          </button>

          {/* Manage Storage */}
          <button
            onClick={onManageStorage}
            className="w-full px-4 py-2 bg-gray-900/30 text-gray-400 hover:bg-gray-900/50 border border-gray-700/50 rounded-lg font-medium transition-all duration-150 flex items-center justify-center text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 active:scale-95"
            aria-label="Manage storage and view storage usage"
          >
            <span className="mr-2">💾</span>
            Manage Storage
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
              aria-label="Post content"
              aria-describedby="post-content-help"
            />
            <div className="flex justify-between items-center mt-1">
              <p id="post-content-help" className="text-xs text-gray-500">
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
            aria-label="Tags for this post"
            aria-describedby="tags-help"
          />
          
          <button
            type="submit"
            disabled={(!postContent.trim() && !tagInput.trim()) || isPosting}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-sm flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95"
            aria-label={postContent.trim() ? 'Create post' : 'Tag URL'}
          >
            {isPosting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                <span>Posting...</span>
              </>
            ) : (
              <span>{postContent.trim() ? 'Create Post' : 'Tag URL'}</span>
            )}
          </button>
        </form>

        <p id="tags-help" className="text-xs text-gray-500 mt-2">
          Posts are published to your Pubky homeserver and tagged for discovery.
        </p>
      </div>
    </div>
  );
}

export default MainView;

