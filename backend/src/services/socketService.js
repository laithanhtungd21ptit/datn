/**
 * Socket.IO service for real-time notifications
 * This service provides a way to emit notifications to users via Socket.IO
 */

let io = null;

/**
 * Initialize Socket.IO instance
 * @param {Server} socketIOServer - Socket.IO server instance
 */
export function initializeSocket(socketIOServer) {
  io = socketIOServer;
  console.log('Socket.IO service initialized');
}

/**
 * Get Socket.IO instance
 * @returns {Server|null} Socket.IO server instance
 */
export function getSocketIO() {
  return io;
}

/**
 * Emit notification to a specific user
 * @param {string} userId - User ID to send notification to
 * @param {object} notification - Notification object
 */
export function emitNotificationToUser(userId, notification) {
  if (!io) {
    console.warn('Socket.IO not initialized, skipping notification emit');
    return;
  }

  try {
    // Format notification for frontend
    const formattedNotification = {
      id: notification._id?.toString() || notification.id,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      time: notification.createdAt 
        ? new Date(notification.createdAt).toLocaleString('vi-VN')
        : new Date().toLocaleString('vi-VN'),
      class: notification.classId?.name || notification.class || 'Unknown Class',
      sender: notification.senderId?.fullName || notification.sender || 'Giảng viên',
      isRead: notification.isRead || false
    };

    // Emit to user's room
    io.to(`user_${userId}`).emit('new_notification', formattedNotification);
    console.log(`Emitted notification to user ${userId}: ${notification.title}`);
  } catch (error) {
    console.error('Error emitting notification to user:', error);
  }
}

/**
 * Emit notifications to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {object} notification - Notification object
 */
export function emitNotificationToUsers(userIds, notification) {
  if (!io) {
    console.warn('Socket.IO not initialized, skipping notification emit');
    return;
  }

  userIds.forEach(userId => {
    emitNotificationToUser(userId, notification);
  });
}

