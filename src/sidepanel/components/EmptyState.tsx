interface EmptyStateProps {
  currentUrl: string;
}

function EmptyState({ }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-24 h-24 bg-[#1F1F1F] rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      
      <h2 className="text-xl font-bold text-white mb-3">
        No Posts Yet
      </h2>
      
      <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
        Nobody has shared anything about this page yet across the network.
        Be the first to tag and share it!
      </p>

      <div className="bg-[#1F1F1F] border border-[#3F3F3F] rounded-lg p-4 text-left max-w-md mx-auto">
        <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          How it works
        </h3>
        <ul className="text-xs text-gray-400 space-y-2">
          <li>• When anyone tags/bookmarks a URL, it appears here</li>
          <li>• Posts are fetched from the Pubky network in real-time</li>
          <li>• Tag this page to share it with the network</li>
        </ul>
      </div>

      <div className="mt-6">
        <button
          onClick={() => {
            // Open the popup
            chrome.action.openPopup();
          }}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition shadow-lg"
        >
          Tag This Page
        </button>
      </div>
    </div>
  );
}

export default EmptyState;

