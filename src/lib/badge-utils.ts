// Badge API utility functions

/**
 * Update the app badge count (PWA feature)
 * Works on supported browsers (Chrome, Edge on desktop and mobile)
 */
export const updateAppBadge = async (count: number): Promise<void> => {
  try {
    // Try to use the Badge API directly
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    }

    // Also notify the service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: count > 0 ? 'UPDATE_BADGE' : 'CLEAR_BADGE',
        count,
      });
    }
  } catch (error) {
    // Badge API not supported or permission denied - fail silently
    console.debug('Badge API not available:', error);
  }
};

/**
 * Clear the app badge
 */
export const clearAppBadge = async (): Promise<void> => {
  await updateAppBadge(0);
};

/**
 * Check if Badge API is supported
 */
export const isBadgeSupported = (): boolean => {
  return 'setAppBadge' in navigator;
};
