/**
 * @fileoverview Sync status indicator component.
 * 
 * Displays the current sync status of annotations and drawings,
 * and provides a button to trigger manual sync.
 */

import { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';

interface SyncStatusData {
  pendingAnnotations: number;
  pendingDrawings: number;
  hasPending: boolean;
  offscreenAvailable?: boolean;
}

function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  // Fetch sync status on mount and periodically
  useEffect(() => {
    fetchSyncStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchSyncStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SYNC_STATUS',
      });

      if (response.success) {
        setStatus({
          pendingAnnotations: response.pendingAnnotations || 0,
          pendingDrawings: response.pendingDrawings || 0,
          hasPending: response.hasPending || false,
          offscreenAvailable: response.offscreenAvailable,
        });
        setError(null);
      } else {
        setError(response.error || 'Failed to get sync status');
      }
    } catch (err) {
      logger.error('SyncStatus', 'Failed to fetch sync status', err as Error);
      setError('Failed to check sync status');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setLastSyncResult(null);
    setError(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_ALL_PENDING',
      });

      if (response.success) {
        const synced = (response.annotationsSynced || 0) + (response.drawingsSynced || 0);
        setLastSyncResult(
          synced > 0 
            ? `Synced ${synced} item${synced > 1 ? 's' : ''}!`
            : 'Everything is synced!'
        );
        // Refresh status
        await fetchSyncStatus();
      } else {
        setError(response.error || 'Sync failed');
      }
    } catch (err) {
      logger.error('SyncStatus', 'Failed to sync', err as Error);
      setError('Failed to sync. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show anything if no pending items and no errors
  if (!status?.hasPending && !error && !lastSyncResult) {
    return null;
  }

  const totalPending = (status?.pendingAnnotations || 0) + (status?.pendingDrawings || 0);

  return (
    <div className="mb-3 p-2 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status?.hasPending ? (
            <>
              <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-300">
                {totalPending} pending sync{totalPending > 1 ? 's' : ''}
              </span>
            </>
          ) : lastSyncResult ? (
            <>
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-xs text-green-400">{lastSyncResult}</span>
            </>
          ) : error ? (
            <>
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="text-xs text-red-400">{error}</span>
            </>
          ) : null}
        </div>

        {status?.hasPending && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`
              text-xs px-2 py-1 rounded
              ${isSyncing 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-500 text-white'}
              transition-colors
            `}
          >
            {isSyncing ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                    fill="none"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Syncing...
              </span>
            ) : (
              'Sync Now'
            )}
          </button>
        )}
      </div>

      {status?.hasPending && (
        <div className="mt-1 text-xs text-gray-500">
          {status.pendingAnnotations > 0 && (
            <span>{status.pendingAnnotations} annotation{status.pendingAnnotations > 1 ? 's' : ''}</span>
          )}
          {status.pendingAnnotations > 0 && status.pendingDrawings > 0 && <span>, </span>}
          {status.pendingDrawings > 0 && (
            <span>{status.pendingDrawings} drawing{status.pendingDrawings > 1 ? 's' : ''}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default SyncStatus;

