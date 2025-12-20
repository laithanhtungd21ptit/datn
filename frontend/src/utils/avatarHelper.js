/**
 * Get avatar URL with proper handling for different sources
 * @param {string} avatarPath - Avatar path from user object
 * @param {string} backendUrl - Backend URL
 * @returns {string|undefined} - Full avatar URL or undefined for fallback
 */
export const getAvatarUrl = (avatarPath, backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000') => {
  if (!avatarPath) return undefined;
  
  // If already absolute URL (Cloudinary, etc)
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  
  // If relative path, prepend backend URL
  return `${backendUrl}${avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`}`;
};

/**
 * Get initials from full name for avatar fallback
 * @param {string} fullName - User's full name
 * @returns {string} - Initials (max 2 characters)
 */
export const getInitials = (fullName) => {
  if (!fullName) return '?';
  
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  // Get first letter of first name and last name
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Get color for avatar based on name (consistent color for same name)
 * @param {string} name - User's name
 * @returns {string} - Hex color code
 */
export const getAvatarColor = (name) => {
  const colors = [
    '#1976d2', // Blue
    '#388e3c', // Green
    '#d32f2f', // Red
    '#f57c00', // Orange
    '#7b1fa2', // Purple
    '#0097a7', // Cyan
    '#c2185b', // Pink
    '#5d4037', // Brown
  ];
  
  if (!name) return colors[0];
  
  // Generate consistent index based on name
  const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[charSum % colors.length];
};
