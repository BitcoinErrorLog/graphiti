import { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';

interface LogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string;
  data?: any;
  error?: any;
}

function DebugPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
    
    // Refresh logs every 2 seconds
    const interval = setInterval(loadLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    const allLogs = await logger.getLogs();
    setLogs(allLogs);
  };

  const handleClearLogs = async () => {
    if (confirm('Clear all debug logs?')) {
      await logger.clearLogs();
      setLogs([]);
    }
  };

  const handleExportLogs = async () => {
    const exported = await logger.exportLogs();
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graphiti-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const getLogColor = (level: string) => {
    switch (level) {
      case 'DEBUG': return 'text-gray-600';
      case 'INFO': return 'text-blue-600';
      case 'WARN': return 'text-yellow-600';
      case 'ERROR': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-gray-900 text-gray-100 p-4 border-b border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">Debug Logs</h3>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded"
          >
            <option value="all">All</option>
            <option value="DEBUG">Debug</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warn</option>
            <option value="ERROR">Error</option>
          </select>
          <button
            onClick={handleExportLogs}
            className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded"
            title="Export logs"
          >
            💾 Export
          </button>
          <button
            onClick={handleClearLogs}
            className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
            title="Clear logs"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded p-2 max-h-64 overflow-y-auto text-xs font-mono">
        {filteredLogs.length === 0 ? (
          <p className="text-gray-500">No logs to display</p>
        ) : (
          <div className="space-y-1">
            {filteredLogs.slice(-50).map((log, idx) => (
              <div key={idx} className="border-b border-gray-700 pb-1 mb-1">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`font-bold ${getLogColor(log.level)}`}>
                    [{log.level}]
                  </span>
                  <span className="text-cyan-400">{log.context}:</span>
                  <span className="flex-1">{log.message}</span>
                </div>
                {log.data && (
                  <div className="ml-4 mt-1 text-gray-400 text-[10px]">
                    {JSON.stringify(log.data, null, 2)}
                  </div>
                )}
                {log.error && (
                  <div className="ml-4 mt-1 text-red-400 text-[10px]">
                    Error: {log.error.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-500 mt-2">
        Showing last 50 logs. Total: {filteredLogs.length}
      </p>
    </div>
  );
}

export default DebugPanel;

