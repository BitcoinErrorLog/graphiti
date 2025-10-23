import { useState, useEffect } from 'react';
import { authManagerSDK } from '../utils/auth-sdk';
import { storage, Session, StoredBookmark } from '../utils/storage';
import { pubkyAPISDK } from '../utils/pubky-api-sdk';
import { logger } from '../utils/logger';
import AuthView from './components/AuthView';
import MainView from './components/MainView';
import DebugPanel from './components/DebugPanel';
import { ProfileEditor } from './components/ProfileEditor';

type View = 'main' | 'profile';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
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

      // Check authentication
      const existingSession = await authManagerSDK.getSession();
      setSession(existingSession);

      // Get current tab info
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        setCurrentUrl(tab.url);
        setCurrentTitle(tab.title || '');
        logger.debug('App', 'Current tab info', { url: tab.url, title: tab.title });
      }

      setLoading(false);
    } catch (error) {
      logger.error('App', 'Failed to initialize', error as Error);
      setLoading(false);
    }
  };

  const handleAuthSuccess = (newSession: Session) => {
    setSession(newSession);
    logger.info('App', 'Authentication successful');
  };

  const handleSignOut = async () => {
    try {
      await authManagerSDK.signOut();
      setSession(null);
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
        alert('Bookmark removed!');
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
        alert('Bookmarked!');
      }
    } catch (error) {
      logger.error('App', 'Failed to handle bookmark', error as Error);
      alert('Failed to bookmark. Check debug logs for details.');
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
      alert(content.trim() ? 'Posted!' : `Tagged with: ${tags.join(', ')}`);
    } catch (error) {
      logger.error('App', 'Failed to create post', error as Error);
      alert('Failed to create post. Check debug logs for details.');
    }
  };

  const handleOpenSidePanel = () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    logger.info('App', 'Opening side panel');
  };

  const handleEditProfile = () => {
    setCurrentView('profile');
  };

  const handleBackToMain = () => {
    setCurrentView('main');
  };

  if (loading) {
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
          />
        )}
      </div>
    </div>
  );
}

export default App;

