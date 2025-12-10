import { useState, useEffect } from 'react';
import { storage, Session, StoredBookmark } from '../utils/storage';
import { pubkyAPISDK } from '../utils/pubky-api-sdk';
import { logger } from '../utils/logger';
import { DrawingSync } from '../utils/drawing-sync';
import AuthView from './components/AuthView';
import MainView from './components/MainView';
import DebugPanel from './components/DebugPanel';
import { ProfileEditor } from './components/ProfileEditor';
import StorageManager from './components/StorageManager';
import ToastContainer from './components/Toast';
import { useSession } from '../contexts/SessionContext';
import { toastManager } from '../utils/toast';

type View = 'main' | 'profile' | 'storage';

function App() {
  const { session, loading: sessionLoading, setSession, signOut, refreshSession } = useSession();
  const [uiLoading, setUiLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);
  const [currentView, setCurrentView] = useState<View>('main');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      logger.info('App', 'Initializing popup');

      const refreshedSession = await refreshSession();

      // Get current tab info
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        setCurrentUrl(tab.url);
        setCurrentTitle(tab.title || '');
        logger.debug('App', 'Current tab info', { url: tab.url, title: tab.title });
      }

      // Sync pending drawings to Pubky (if authenticated)
      const sessionForSync = refreshedSession ?? session;
      if (sessionForSync) {
        DrawingSync.syncPendingDrawings().catch((error) => {
          logger.warn('App', 'Failed to sync drawings in background', error);
        });
      }

      setUiLoading(false);
    } catch (error) {
      logger.error('App', 'Failed to initialize', error as Error);
      setUiLoading(false);
    }
  };

  const handleAuthSuccess = (newSession: Session) => {
    setSession(newSession);
    logger.info('App', 'Authentication successful');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      logger.info('App', 'Signed out successfully');
    } catch (error) {
      logger.error('App', 'Failed to sign out', error as Error);
    }
  };

  const handleBookmark = async () => {
    try {
      if (!session) return;

      logger.info('App', 'Handling bookmark', { url: currentUrl });

      // Check if already bookmarked
      const existingBookmark = await storage.getBookmark(currentUrl);
      if (existingBookmark) {
        // Delete bookmark from homeserver first using the post URI
        if (existingBookmark.postUri) {
          await pubkyAPISDK.deleteBookmark(existingBookmark.postUri);
        }
        
        // Then remove from local storage
        await storage.removeBookmark(currentUrl);
        logger.info('App', 'Bookmark removed from homeserver and local storage');
        toastManager.success('Bookmark removed!');
      } else {
        // Create bookmark on homeserver using SDK
        // This creates a post first, then bookmarks it
        const { fullPath, bookmarkId, postUri } = await pubkyAPISDK.createBookmark(currentUrl);

        // Save locally with bookmark ID and post URI
        const bookmark: StoredBookmark = {
          url: currentUrl,
          title: currentTitle,
          timestamp: Date.now(),
          pubkyUrl: fullPath,
          bookmarkId,
          postUri,
        };
        await storage.saveBookmark(bookmark);

        logger.info('App', 'Bookmark created successfully', { fullPath, bookmarkId, postUri });
        toastManager.success('Bookmarked!');
      }
    } catch (error) {
      logger.error('App', 'Failed to handle bookmark', error as Error);
      toastManager.error('Failed to bookmark. Check debug logs for details.');
    }
  };

  const handlePost = async (content: string, tags: string[]) => {
    try {
      if (!session) return;

      logger.info('App', 'Creating post with content and tags', { content: content.substring(0, 50), tags, url: currentUrl });

      // Append URL to content if content exists, otherwise just use URL
      const fullContent = content.trim() 
        ? `${content.trim()}\n\n${currentUrl}`
        : currentUrl;

      // Create a link post with the content and tags
      // This creates a proper Pubky App post with kind='link'
      const postUrl = await pubkyAPISDK.createLinkPost(currentUrl, fullContent, tags);

      // Save locally
      await storage.saveTags(currentUrl, tags);

      logger.info('App', 'Post created successfully with content and tags', { postUrl, tags });
      toastManager.success(content.trim() ? 'Posted!' : `Tagged with: ${tags.join(', ')}`);
    } catch (error) {
      logger.error('App', 'Failed to create post', error as Error);
      toastManager.error('Failed to create post. Check debug logs for details.');
    }
  };

  const handleOpenSidePanel = () => {
    // Open side panel directly from popup (user gesture is preserved)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({ tabId: tabs[0].id });
        logger.info('App', 'Side panel opened');
      }
    });
  };

  const handleEditProfile = () => {
    setCurrentView('profile');
  };

  const handleManageStorage = () => {
    setCurrentView('storage');
  };

  const handleBackToMain = () => {
    setCurrentView('main');
  };

  if (sessionLoading || uiLoading) {
    return (
      <div className="w-[400px] h-[500px] flex items-center justify-center bg-[#2B2B2B]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] min-h-[500px] bg-[#2B2B2B]">
      {/* Header */}
      <header className="bg-[#1F1F1F] border-b border-[#3F3F3F] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Graphiti</h1>
            <p className="text-xs text-gray-400">Pubky URL Tagger</p>
          </div>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="px-3 py-1 text-xs bg-[#2A2A2A] hover:bg-[#333333] text-gray-300 rounded transition"
            title="Toggle debug panel"
          >
            {showDebug ? '🔧 Hide' : '🔧 Debug'}
          </button>
        </div>
      </header>

      {/* Debug Panel */}
      {showDebug && <DebugPanel />}

      {/* Main Content */}
      <div className="p-4">
        {!session ? (
          <AuthView onAuthSuccess={handleAuthSuccess} />
        ) : currentView === 'profile' ? (
          <div>
            <button
              onClick={handleBackToMain}
              className="mb-4 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              <span>←</span> Back
            </button>
            <ProfileEditor />
          </div>
        ) : currentView === 'storage' ? (
          <div>
            <button
              onClick={handleBackToMain}
              className="mb-4 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              <span>←</span> Back
            </button>
            <StorageManager />
          </div>
        ) : (
          <MainView
            session={session}
            currentUrl={currentUrl}
            currentTitle={currentTitle}
            onSignOut={handleSignOut}
            onBookmark={handleBookmark}
            onPost={handlePost}
            onOpenSidePanel={handleOpenSidePanel}
            onEditProfile={handleEditProfile}
            onManageStorage={handleManageStorage}
          />
        )}
      </div>
      
      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}

export default App;

