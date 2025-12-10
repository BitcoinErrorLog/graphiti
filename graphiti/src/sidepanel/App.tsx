import { useState, useEffect, useRef } from 'react';
import { NexusPost } from '../utils/nexus-client';
import { Annotation } from '../utils/annotations';
import { logger } from '../utils/logger';
import PostCard from './components/PostCard';
import PostCardSkeleton from './components/PostCardSkeleton';
import EmptyState from './components/EmptyState';
import AnnotationCard from './components/AnnotationCard';
import LoadingState from './components/LoadingState';
import KeyboardShortcutsModal from '../popup/components/KeyboardShortcutsModal';
import { useSession } from '../contexts/SessionContext';
import { useTheme } from '../contexts/ThemeContext';

function App() {
  const { session, loading: sessionLoading, refreshSession } = useSession();
  const { theme } = useTheme();
  const [panelLoading, setPanelLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [posts, setPosts] = useState<NexusPost[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [, setLoadingAnnotations] = useState(false); // Used in loadAnnotations callback
  const [activeTab, setActiveTab] = useState<'posts' | 'annotations'>('posts');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postsPage, setPostsPage] = useState(0);
  // @ts-ignore - postsCursor is set for future cursor-based pagination
  const [postsCursor, setPostsCursor] = useState<string | undefined>(undefined);
  const POSTS_PER_PAGE = 20;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializePanel();

    // Listen for tab updates to refresh when URL changes
    const handleTabUpdate = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      // Only care about URL changes for the active tab
      if (changeInfo.url && tab.active) {
        logger.info('SidePanel', 'Tab URL changed, updating feed', { 
          oldUrl: currentUrl, 
          newUrl: changeInfo.url 
        });
        setCurrentUrl(changeInfo.url);
      }
    };

    // Listen for tab activation (switching between tabs)
    const handleTabActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && tab.url !== currentUrl) {
          logger.info('SidePanel', 'Active tab changed, updating feed', { 
            oldUrl: currentUrl, 
            newUrl: tab.url 
          });
          setCurrentUrl(tab.url);
        }
      } catch (error) {
        logger.error('SidePanel', 'Failed to get tab info', error as Error);
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    chrome.tabs.onActivated.addListener(handleTabActivated);

    // Cleanup listeners
    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
    };
  }, []);

  useEffect(() => {
    // Load posts and annotations if we have a URL
    if (currentUrl) {
      // Reset pagination when URL changes
      setPostsPage(0);
      setPostsCursor(undefined);
      setHasMorePosts(true);
      setPosts([]);
      loadPosts(true);
      loadAnnotations();
    }
  }, [session, currentUrl]);

  useEffect(() => {
    // Listen for messages to scroll to annotations or switch tabs
    const handleMessage = (message: any) => {
      if (message.type === 'SCROLL_TO_ANNOTATION') {
        setActiveTab('annotations');
        // Scroll logic will be handled in the render
      }
      
      if (message.type === 'SWITCH_TO_ANNOTATIONS') {
        logger.info('SidePanel', 'Switching to annotations tab via keyboard shortcut');
        setActiveTab('annotations');
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // Keyboard shortcut listener for Shift+?
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        setShowShortcuts(true);
      }
      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts]);

  const initializePanel = async () => {
    try {
      logger.info('SidePanel', 'Initializing side panel');

      const refreshedSession = await refreshSession();

      // Sync any pending annotations to Pubky (from when background couldn't do it)
      const activeSession = refreshedSession ?? session;
      if (activeSession) {
        try {
          const { AnnotationSync } = await import('../utils/annotation-sync');
          await AnnotationSync.syncPendingAnnotations();
        } catch (syncError) {
          logger.warn('SidePanel', 'Failed to sync pending annotations', syncError);
        }
      }

      // Get current tab info
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        setCurrentUrl(tab.url);
        logger.debug('SidePanel', 'Current tab URL', { url: tab.url });
      }

      setPanelLoading(false);
    } catch (error) {
      logger.error('SidePanel', 'Failed to initialize', error as Error);
      setPanelLoading(false);
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

  const loadPosts = async (reset: boolean = false) => {
    try {
      let currentPage = postsPage;
      if (reset) {
        setPostsPage(0);
        setPostsCursor(undefined);
        setHasMorePosts(true);
        currentPage = 0;
      }
      
      setLoadingPosts(true);
      if (reset) {
        announceToScreenReader('Loading posts...');
      }
      
      logger.info('SidePanel', 'Loading posts for URL via Nexus', { 
        url: currentUrl, 
        signedIn: !!session,
        page: currentPage,
        searchScope: 'ALL posts across network'
      });

      // Search for ALL posts containing this URL using Nexus API
      // Session is optional - we show all posts regardless of login status
      const urlHashTag = await import('../utils/crypto').then(m => m.generateUrlHashTag(currentUrl));
      const { nexusClient } = await import('../utils/nexus-client');
      
      const skip = currentPage * POSTS_PER_PAGE;
      const response = await nexusClient.streamPosts({
        tags: urlHashTag,
        limit: POSTS_PER_PAGE,
        skip: skip,
        viewer_id: session?.pubky
      });

      const newPosts = response.data || [];
      
      if (reset) {
        setPosts(newPosts);
        setPostsPage(1);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
        setPostsPage(prev => prev + 1);
      }
      
      // Check if there are more posts
      const hasMore = newPosts.length === POSTS_PER_PAGE;
      setHasMorePosts(hasMore);
      setPostsCursor(response.cursor);

      const totalCount = reset ? newPosts.length : posts.length + newPosts.length;
      if (reset) {
        announceToScreenReader(`Loaded ${totalCount} ${totalCount === 1 ? 'post' : 'posts'}`);
      }
      logger.info('SidePanel', 'Posts loaded', { count: newPosts.length, total: totalCount, hasMore });
    } catch (error) {
      logger.error('SidePanel', 'Failed to load posts', error as Error);
      if (reset) {
        setPosts([]);
        announceToScreenReader('Failed to load posts', 'assertive');
      }
    } finally {
      setLoadingPosts(false);
    }
  };

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (activeTab !== 'posts' || !hasMorePosts || loadingPosts || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const lastEntry = entries[entries.length - 1];
        if (lastEntry.isIntersecting) {
          loadPosts(false);
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [activeTab, hasMorePosts, loadingPosts, posts.length, currentUrl]);

  const loadAnnotations = async () => {
    try {
      setLoadingAnnotations(true);
      announceToScreenReader('Loading annotations...');
      logger.info('SidePanel', 'Loading annotations for URL', { url: currentUrl });

      // Request annotations from background script
      chrome.runtime.sendMessage(
        {
          type: 'GET_ANNOTATIONS',
          url: currentUrl,
        },
        (response) => {
          if (response?.annotations) {
            const count = response.annotations.length;
            setAnnotations(response.annotations);
            announceToScreenReader(`Loaded ${count} ${count === 1 ? 'annotation' : 'annotations'}`);
            logger.info('SidePanel', 'Annotations loaded', { count });
          }
          setLoadingAnnotations(false);
        }
      );
    } catch (error) {
      logger.error('SidePanel', 'Failed to load annotations', error as Error);
      setAnnotations([]);
      announceToScreenReader('Failed to load annotations', 'assertive');
      setLoadingAnnotations(false);
    }
  };

  const handleRefresh = () => {
    loadPosts();
    loadAnnotations();
  };

  const handleDeleteAnnotation = async (annotation: Annotation) => {
    try {
      logger.info('SidePanel', 'Deleting annotation', { id: annotation.id, url: annotation.url });
      
      // Delete from Pubky homeserver if it has a postUri
      if (annotation.postUri && session?.pubky) {
        try {
          const { pubkyAPISDK } = await import('../utils/pubky-api-sdk');
          await pubkyAPISDK.deleteAnnotationPost(annotation.postUri);
          logger.info('SidePanel', 'Annotation post deleted from homeserver', { postUri: annotation.postUri });
        } catch (deleteError) {
          logger.warn('SidePanel', 'Failed to delete annotation from homeserver', deleteError as Error);
          // Continue with local deletion even if remote deletion fails
        }
      }

      // Delete from local storage
      const { annotationStorage } = await import('../utils/annotations');
      await annotationStorage.deleteAnnotation(annotation.url, annotation.id);
      
      // Notify content script to remove highlight from page
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab?.id && currentTab.url) {
          // Normalize URLs for comparison
          const normalizeUrl = (url: string | undefined) => url?.split('#')[0].split('?')[0];
          const currentUrl = normalizeUrl(currentTab.url);
          const annotationUrl = normalizeUrl(annotation.url);
          
          if (currentUrl === annotationUrl) {
            chrome.tabs.sendMessage(currentTab.id, {
              type: 'REMOVE_ANNOTATION',
              annotationId: annotation.id,
            }).catch((error) => {
              // Content script might not be loaded - this is expected
              logger.debug('SidePanel', 'Could not notify content script of deletion', { error: error.message });
            });
          }
        }
      });
      
      // Remove from local state
      setAnnotations(prev => prev.filter(a => a.id !== annotation.id));
      
      announceToScreenReader('Annotation deleted');
      logger.info('SidePanel', 'Annotation deleted successfully', { id: annotation.id });
    } catch (error) {
      logger.error('SidePanel', 'Failed to delete annotation', error as Error);
      announceToScreenReader('Failed to delete annotation', 'assertive');
    }
  };

  const handleAnnotationClick = (annotation: Annotation) => {
    logger.info('SidePanel', 'Annotation clicked', { id: annotation.id, url: annotation.url });
    
    // Helper to safely send message with error handling
    const sendHighlightMessage = (tabId: number) => {
      chrome.tabs.sendMessage(tabId, {
        type: 'HIGHLIGHT_ANNOTATION',
        annotationId: annotation.id,
      }).catch((error) => {
        // Content script not loaded - this is expected on chrome:// pages or after extension reload
        logger.warn('SidePanel', 'Could not send highlight message - refresh the page', { error: error.message });
      });
    };
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab?.id) return;

      // Normalize URLs for comparison (remove hash and query params)
      const normalizeUrl = (url: string | undefined) => url?.split('#')[0].split('?')[0];
      const currentUrl = normalizeUrl(currentTab.url);
      const annotationUrl = normalizeUrl(annotation.url);
      
      if (currentUrl === annotationUrl) {
        // Already on the page, just highlight
        sendHighlightMessage(currentTab.id);
      } else if (annotation.url) {
        // Navigate to the page first, then highlight after it loads
        logger.info('SidePanel', 'Navigating to annotation page', { url: annotation.url });
        const tabId = currentTab.id;
        chrome.tabs.update(tabId, { url: annotation.url }, () => {
          // Wait for page to load before highlighting
          const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              // Delay to ensure content script is ready
              setTimeout(() => {
                sendHighlightMessage(tabId);
              }, 500);
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
        });
      }
    });
  };

  if (sessionLoading || panelLoading) {
    return <LoadingState message="Initializing..." />;
  }

  // Show sign-in banner if not authenticated (but still show posts below)
  const SignInBanner = !session ? (
    <div className="bg-[#1A1A1A] border-b border-[#3F3F3F] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Not Signed In</h3>
            <p className="text-xs text-gray-400">Sign in to create posts and bookmarks</p>
          </div>
        </div>
        <button
          onClick={() => chrome.action.openPopup()}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition flex-shrink-0"
        >
          Sign In
        </button>
      </div>
    </div>
  ) : null;

  const bgClass = theme === 'light' ? 'bg-white' : 'bg-[#2B2B2B]';

  return (
    <div className={`min-h-screen ${bgClass}`}>
      {/* Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-semibold"
      >
        Skip to main content
      </a>
      
      {/* ARIA Live Region for announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        id="aria-live-region"
      />
      
      {/* Sign In Banner (if not authenticated) */}
      {SignInBanner}
      
      {/* Header */}
      <header className="bg-[#1F1F1F] border-b border-[#3F3F3F] sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-white">Graphiti Feed</h1>
              <p className="text-xs text-gray-400">
                {activeTab === 'posts' ? 'All posts about this page' : 'Annotations on this page'}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loadingPosts}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition disabled:opacity-50 text-gray-400 hover:text-white"
              title="Refresh"
            >
              <svg 
                className={`w-5 h-5 ${loadingPosts ? 'animate-spin' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition ${
                activeTab === 'posts'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
              }`}
            >
              Posts ({posts.length})
            </button>
            <button
              onClick={() => setActiveTab('annotations')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition ${
                activeTab === 'annotations'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                  : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
              }`}
            >
              Annotations ({annotations.length})
            </button>
          </div>

          {/* Current URL */}
          <div className="bg-[#2A2A2A] border border-[#3F3F3F] rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Current page:</p>
            <p className="text-xs text-gray-300 break-all font-mono">
              {currentUrl}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main id="main-content" className="p-4 max-w-4xl mx-auto" tabIndex={-1}>
        {activeTab === 'posts' ? (
          // Posts Feed
          loadingPosts ? (
            <div className="space-y-3">
              <PostCardSkeleton />
              <PostCardSkeleton />
              <PostCardSkeleton />
            </div>
          ) : !posts || posts.length === 0 ? (
            <EmptyState currentUrl={currentUrl} />
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard key={post.details?.id || post.id || Math.random().toString()} post={post} />
              ))}
              {hasMorePosts && (
                <div ref={sentinelRef} className="flex justify-center py-4">
                  {loadingPosts && (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  )}
                </div>
              )}
            </div>
          )
        ) : (
          // Annotations Feed
          annotations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Annotations Yet</h3>
              <p className="text-gray-400 text-sm mb-4">
                Select text on the page to create the first annotation
              </p>
              <div className="text-left max-w-md mx-auto bg-[#1F1F1F] border border-[#3F3F3F] rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-2">How to annotate:</p>
                <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
                  <li>Select any text on the page</li>
                  <li>Click "Add Annotation" button</li>
                  <li>Write your comment</li>
                  <li>Your annotation will be visible to everyone!</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {annotations.map((annotation) => (
                <AnnotationCard 
                  key={annotation.id} 
                  annotation={annotation}
                  onHighlight={handleAnnotationClick}
                  onDelete={handleDeleteAnnotation}
                  canDelete={session?.pubky === annotation.author}
                />
              ))}
            </div>
          )
        )}
      </main>
      
      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />
    </div>
  );
}

export default App;

