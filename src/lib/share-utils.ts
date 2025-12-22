/**
 * Utilities for handling shared files via Share Target API
 * Uses Cache Storage for temporary file storage
 */

const SHARE_CACHE_NAME = 'shared-files-cache';

/**
 * Save a shared file to Cache Storage
 * @returns Unique ID for retrieving the file
 */
export const saveSharedFile = async (file: File): Promise<string> => {
  const shareId = `share-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const cache = await caches.open(SHARE_CACHE_NAME);
  
  // Store file as a Response object
  const response = new Response(file, {
    headers: {
      'Content-Type': file.type || 'application/gpx+xml',
      'X-File-Name': encodeURIComponent(file.name),
      'X-Share-Id': shareId,
    }
  });
  
  await cache.put(`/${shareId}`, response);
  return shareId;
};

/**
 * Retrieve a shared file from Cache Storage
 */
export const getSharedFile = async (shareId: string): Promise<File | null> => {
  try {
    const cache = await caches.open(SHARE_CACHE_NAME);
    const response = await cache.match(`/${shareId}`);
    
    if (!response) {
      return null;
    }
    
    const blob = await response.blob();
    const fileName = decodeURIComponent(
      response.headers.get('X-File-Name') || 'shared-route.gpx'
    );
    
    return new File([blob], fileName, { type: blob.type });
  } catch (error) {
    console.error('Error retrieving shared file:', error);
    return null;
  }
};

/**
 * Clear a shared file from Cache Storage
 */
export const clearSharedFile = async (shareId: string): Promise<void> => {
  try {
    const cache = await caches.open(SHARE_CACHE_NAME);
    await cache.delete(`/${shareId}`);
  } catch (error) {
    console.error('Error clearing shared file:', error);
  }
};

/**
 * Check if Share Target API is supported
 */
export const isShareTargetSupported = (): boolean => {
  return 'share' in navigator && 'canShare' in navigator;
};
