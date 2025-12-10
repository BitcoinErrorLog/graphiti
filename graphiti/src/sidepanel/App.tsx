import { useState, useEffect } from 'react';
import { pubkyAPISDK } from '../utils/pubky-api-sdk';
import { NexusPost } from '../utils/nexus-client';
import { Annotation } from '../utils/annotations';
import { logger } from '../utils/logger';
import PostCard from './components/PostCard';
import EmptyState from './components/EmptyState';
import AnnotationCard from './components/AnnotationCard';
import LoadingState from './components/LoadingState';
import { useSession } from '../contexts/SessionContext';

function App() {
  const { session, loading: sessionLoading, refreshSession } = useSession();
  const [panelLoading, setPanelLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [posts, setPosts] = useState<NexusPost[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [, setLoadingAnnotations] = useState(false); // Used in loadAnnotations callback
  const [activeTab, setActiveTab] = useState<'posts' | 'annotations'>('posts');

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
      loadPosts();
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

  const loadPosts = async () => {
    try {
      setLoadingPosts(true);
      logger.info('SidePanel', 'Loading posts for URL via Nexus', { 
        url: currentUrl, 
        signedIn: !!session,
        searchScope: 'ALL posts across network'
      });

      // Search for ALL posts containing this URL using Nexus API
      // Session is optional - we show all posts regardless of login status
      const foundPosts = await pubkyAPISDK.searchPostsByUrl(currentUrl, session?.pubky);
      setPosts(foundPosts || []);

      logger.info('SidePanel', 'Posts loaded', { count: foundPosts?.length || 0 });
    } catch (error) {
      logger.error('SidePanel', 'Failed to load posts', error as Error);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadAnnotations = async () => {
    try {
      setLoadingAnnotations(true);
      logger.info('SidePanel', 'Loading annotations for URL', { url: currentUrl });

      // Request annotations from background script
      chrome.runtime.sendMessage(
        {
          type: 'GET_ANNOTATIONS',
          url: currentUrl,
        },
        (response) => {
          if (response?.annotations) {
            setAnnotations(response.annotations);
            logger.info('SidePanel', 'Annotations loaded', { count: response.annotations.length });
          }
          setLoadingAnnotations(false);
        }
      );
    } catch (error) {
      logger.error('SidePanel', 'Failed to load annotations', error as Error);
      setAnnotations([]);
      setLoadingAnnotations(false);
    }
  };

  const handleRefresh = () => {
    loadPosts();
    loadAnnotations();
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

  return (
    <div className="min-h-screen bg-[#2B2B2B]">
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
      <div className="p-4">
        {activeTab === 'posts' ? (
          // Posts Feed
          loadingPosts ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading posts...</p>
            </div>
          ) : !posts || posts.length === 0 ? (
            <EmptyState currentUrl={currentUrl} />
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard key={post.details?.id || post.id || Math.random().toString()} post={post} />
              ))}
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
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default App;

