/**
 * @fileoverview Storage management component for viewing and managing drawings.
 * 
 * Provides:
 * - Storage quota usage display with warnings
 * - List of all stored drawings
 * - Individual drawing deletion
 * - Storage cleanup guidance
 */

import { useState, useEffect } from 'react';
import { storage, Drawing } from '../../utils/storage';
import { logger } from '../../utils/logger';
import { formatBytes } from '../../utils/image-compression';
import { toastManager } from '../../utils/toast';

interface StorageQuota {
  hasSpace: boolean;
  usedMB: number;
  quotaMB: number;
  percentUsed: number;
}

interface DrawingInfo extends Drawing {
  sizeKB: number;
  formattedSize: string;
}

function StorageManager() {
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [drawings, setDrawings] = useState<DrawingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      setLoading(true);
      
      // Get quota info
      const quotaInfo = await storage.checkStorageQuota();
      setQuota(quotaInfo);

      // Get all drawings with size info
      const allDrawings = await storage.getAllDrawings();
      const drawingsList: DrawingInfo[] = [];

      for (const url in allDrawings) {
        const drawing = allDrawings[url];
        // Calculate approximate size
        const base64Data = drawing.canvasData.split(',')[1] || '';
        const sizeBytes = (base64Data.length * 3) / 4;
        const sizeKB = sizeBytes / 1024;

        drawingsList.push({
          ...drawing,
          sizeKB,
          formattedSize: formatBytes(sizeBytes),
        });
      }

      // Sort by size (largest first)
      drawingsList.sort((a, b) => b.sizeKB - a.sizeKB);
      setDrawings(drawingsList);
    } catch (error) {
      logger.error('StorageManager', 'Failed to load storage info', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDrawing = async (url: string) => {
    if (!confirm('Are you sure you want to delete this drawing? This cannot be undone.')) {
      return;
    }

    try {
      setDeleting(url);
      await storage.deleteDrawing(url);
      logger.info('StorageManager', 'Drawing deleted', { url });
      
      // Reload storage info
      await loadStorageInfo();
      toastManager.success('Drawing deleted successfully');
    } catch (error) {
      logger.error('StorageManager', 'Failed to delete drawing', error as Error);
      toastManager.error('Failed to delete drawing. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const getQuotaWarningLevel = (percentUsed: number): 'none' | 'warning' | 'critical' => {
    if (percentUsed >= 90) return 'critical';
    if (percentUsed >= 75) return 'warning';
    return 'none';
  };

  const getQuotaColor = (percentUsed: number): string => {
    if (percentUsed >= 90) return 'text-red-400';
    if (percentUsed >= 75) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getQuotaBgColor = (percentUsed: number): string => {
    if (percentUsed >= 90) return 'bg-red-900/20 border-red-700/30';
    if (percentUsed >= 75) return 'bg-yellow-900/20 border-yellow-700/30';
    return 'bg-gray-900/20 border-gray-700/30';
  };

  if (loading) {
    return (
      <div className="text-center text-gray-500 text-sm py-4">
        Loading storage information...
      </div>
    );
  }

  if (!quota) {
    return (
      <div className="text-center text-red-400 text-sm py-4">
        Failed to load storage information
      </div>
    );
  }

  const warningLevel = getQuotaWarningLevel(quota.percentUsed);
  const totalSizeKB = drawings.reduce((sum, d) => sum + d.sizeKB, 0);

  return (
    <div className="space-y-4">
      {/* Storage Quota Display */}
      <div className={`border rounded-lg p-4 ${getQuotaBgColor(quota.percentUsed)}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-300">Storage Usage</h3>
          <span className={`text-sm font-medium ${getQuotaColor(quota.percentUsed)}`}>
            {quota.percentUsed.toFixed(1)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full transition-all ${
              warningLevel === 'critical'
                ? 'bg-red-500'
                : warningLevel === 'warning'
                ? 'bg-yellow-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(quota.percentUsed, 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-400">
          <span>{formatBytes(quota.usedMB * 1024 * 1024)} used</span>
          <span>{formatBytes(quota.quotaMB * 1024 * 1024)} total</span>
        </div>

        {/* Warnings */}
        {warningLevel !== 'none' && (
          <div className={`mt-3 p-2 rounded text-xs ${
            warningLevel === 'critical'
              ? 'bg-red-900/30 text-red-300'
              : 'bg-yellow-900/30 text-yellow-300'
          }`}>
            {warningLevel === 'critical' ? (
              <div>
                <p className="font-medium mb-1">⚠️ Storage nearly full!</p>
                <p className="text-xs">
                  You're using {quota.percentUsed.toFixed(1)}% of available storage.
                  Consider deleting old drawings to free up space.
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium mb-1">⚠️ Storage getting full</p>
                <p className="text-xs">
                  You're using {quota.percentUsed.toFixed(1)}% of available storage.
                  Monitor your usage and delete unused drawings if needed.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawings List */}
      <div className="bg-[#1F1F1F] border border-[#3F3F3F] rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300">
            Stored Drawings ({drawings.length})
          </h3>
          {drawings.length > 0 && (
            <span className="text-xs text-gray-500">
              Total: {formatBytes(totalSizeKB * 1024)}
            </span>
          )}
        </div>

        {drawings.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            No drawings stored yet
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {drawings.map((drawing) => (
              <div
                key={drawing.id}
                className="bg-[#2A2A2A] border border-[#3F3F3F] rounded p-2 hover:border-[#667eea] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-1 truncate" title={drawing.url}>
                      {drawing.url.length > 50
                        ? drawing.url.substring(0, 50) + '...'
                        : drawing.url}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>Size: {drawing.formattedSize}</span>
                      <span>
                        {new Date(drawing.timestamp).toLocaleDateString()}
                      </span>
                      {drawing.pubkyUrl && (
                        <span className="text-green-400">✓ Synced</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDrawing(drawing.url)}
                    disabled={deleting === drawing.url}
                    className="ml-2 px-2 py-1 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete this drawing"
                  >
                    {deleting === drawing.url ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Management Tips */}
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 text-xs text-blue-300">
        <p className="font-medium mb-2">💡 Storage Management Tips:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-200">
          <li>Drawings are automatically compressed to save space</li>
          <li>Synced drawings (✓) are safely stored on your Pubky homeserver</li>
          <li>Delete local copies of synced drawings to free up space</li>
          <li>Chrome Extension storage limit is ~5MB (shared with other extensions)</li>
        </ul>
      </div>
    </div>
  );
}

export default StorageManager;

