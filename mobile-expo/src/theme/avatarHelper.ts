import { BACKEND_URL } from '../config/constants';

/**
 * Get avatar URL with proper handling for different sources
 * @param avatarPath - Avatar path from user object
 * @returns Full avatar URL or undefined for fallback
 */
export const getAvatarUrl = (avatarPath?: string): string | undefined => {
  if (!avatarPath) return undefined;
  
  // If already absolute URL (Cloudinary, etc)
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  
  // If relative path, prepend backend URL
  const cleanBackendUrl = BACKEND_URL.replace(/\/$/, '');
  const cleanPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
  return `${cleanBackendUrl}${cleanPath}`;
};

/**
 * Get initials from full name for avatar fallback
 * @param fullName - User's full name
 * @returns Initials (max 2 characters)
 */
export const getInitials = (fullName?: string): string => {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

