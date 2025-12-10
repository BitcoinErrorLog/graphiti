import { useState, useEffect, Suspense, lazy } from 'react';
import { storage, Session, StoredBookmark } from '../utils/storage';
import { pubkyAPISDK } from '../utils/pubky-api-sdk';
import { logger } from '../utils/logger';
import { DrawingSync } from '../utils/drawing-sync';
import AuthView from './components/AuthView';
import MainView from './components/MainView';
import ToastContainer from './components/Toast';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import LoadingSpinner from './components/LoadingSpinner';
import { useSession } from '../contexts/SessionContext';
import { useTheme } from '../contexts/ThemeContext';
import { toastManager } from '../utils/toast';

// Lazy load less-used components
const DebugPanel = lazy(() => import('./components/DebugPanel'));
const ProfileEditor = lazy(() => import('./components/ProfileEditor').then(module => ({ default: module.ProfileEditor })));
const StorageManager = lazy(() => import('./components/StorageManager'));

type View = 'main' | 'profile' | 'storage';

function App() {
  const { session, loading: sessionLoading, setSession, signOut, refreshSession } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [uiLoading, setUiLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);
  const [currentView, setCurrentView] = useState<View>('main');
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    initializeApp();
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

  const handleBookmark = async (category?: string) => {
    try {
      if (!session) return;

      logger.info('App', 'Handling bookmark', { url: currentUrl, category });

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
          category: category?.trim() || undefined,
        };
        await storage.saveBookmark(bookmark);

        logger.info('App', 'Bookmark created successfully', { fullPath, bookmarkId, postUri, category });
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

  const themeClasses = theme === 'light' 
    ? 'bg-white text-gray-900'
    : 'bg-[#2B2B2B] text-white';

  return (
    <div className={`w-[400px] min-h-[500px] ${themeClasses}`}>
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
      
      {/* Header */}
      <header className={theme === 'light' ? 'bg-gray-50 border-b border-gray-200 p-4' : 'bg-[#1F1F1F] border-b border-[#3F3F3F] p-4'}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Graphiti</h1>
            <p className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Pubky URL Tagger</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`px-3 py-1 text-xs rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'light' 
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' 
                  : 'bg-[#2A2A2A] hover:bg-[#333333] text-gray-300'
              }`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`px-3 py-1 text-xs rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'light' 
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' 
                  : 'bg-[#2A2A2A] hover:bg-[#333333] text-gray-300'
              }`}
              title="Toggle debug panel"
            >
              {showDebug ? '🔧 Hide' : '🔧 Debug'}
            </button>
          </div>
        </div>
      </header>

      {/* Debug Panel */}
      {showDebug && (
        <Suspense fallback={<LoadingSpinner text="Loading debug panel..." />}>
          <DebugPanel />
        </Suspense>
      )}

      {/* Main Content */}
      <main id="main-content" className="p-4" tabIndex={-1}>
        {!session ? (
          <AuthView onAuthSuccess={handleAuthSuccess} />
        ) : currentView === 'profile' ? (
          <Suspense fallback={<LoadingSpinner text="Loading profile editor..." />}>
            <div>
              <button
                onClick={handleBackToMain}
                className="mb-4 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                <span>←</span> Back
              </button>
              <ProfileEditor />
            </div>
          </Suspense>
        ) : currentView === 'storage' ? (
          <Suspense fallback={<LoadingSpinner text="Loading storage manager..." />}>
            <div>
              <button
                onClick={handleBackToMain}
                className="mb-4 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                <span>←</span> Back
              </button>
              <StorageManager />
            </div>
          </Suspense>
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
      </main>
      
      {/* Toast Container */}
      <ToastContainer />
      
      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />
    </div>
  );
}

export default App;

