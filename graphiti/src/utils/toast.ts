/**
 * @fileoverview Toast notification system.
 * 
 * Provides a centralized toast notification manager to replace alert() calls
 * with user-friendly, non-blocking notifications.
 * 
 * @module utils/toast
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  timestamp: number;
}

class ToastManager {
  private toasts: Toast[] = [];
  private listeners: Set<(toasts: Toast[]) => void> = new Set();
  private defaultDuration = 3000; // 3 seconds

  /**
   * Subscribe to toast updates
   */
  subscribe(listener: (toasts: Toast[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notify(): void {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  /**
   * Show a toast notification
   */
  show(type: ToastType, message: string, duration?: number): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toastDuration = duration ?? this.defaultDuration;
    const toast: Toast = {
      id,
      type,
      message,
      duration: toastDuration,
      timestamp: Date.now(),
    };

    this.toasts.push(toast);
    this.notify();

    // Auto-remove after duration
    if (toastDuration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, toastDuration);
    }

    return id;
  }

  /**
   * Remove a toast by ID
   */
  remove(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notify();
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    this.toasts = [];
    this.notify();
  }

  /**
   * Get all current toasts
   */
  getAll(): Toast[] {
    return [...this.toasts];
  }

  // Convenience methods
  success(message: string, duration?: number): string {
    return this.show('success', message, duration);
  }

  error(message: string, duration?: number): string {
    return this.show('error', message, duration);
  }

  warning(message: string, duration?: number): string {
    return this.show('warning', message, duration);
  }

  info(message: string, duration?: number): string {
    return this.show('info', message, duration);
  }
}

export const toastManager = new ToastManager();

