/**
 * @fileoverview Toast notification component.
 * 
 * Displays non-blocking toast notifications to replace alert() calls.
 */

import { useState, useEffect } from 'react';
import { toastManager, Toast } from '../../utils/toast';

function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts);
    return unsubscribe;
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
}

function ToastItem({ toast }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Fade in animation
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      toastManager.remove(toast.id);
    }, 300); // Wait for fade out animation
  };

  const typeStyles = {
    success: 'bg-green-500/90 text-white border-green-600',
    error: 'bg-red-500/90 text-white border-red-600',
    warning: 'bg-yellow-500/90 text-white border-yellow-600',
    info: 'bg-blue-500/90 text-white border-blue-600',
  };

  return (
    <div
      className={`
        ${typeStyles[toast.type]}
        border rounded-lg shadow-lg p-4 min-w-[300px] max-w-sm
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
        flex items-start justify-between gap-3
      `}
    >
      <div className="flex-1">
        <p className="text-sm font-medium">{toast.message}</p>
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default ToastContainer;

