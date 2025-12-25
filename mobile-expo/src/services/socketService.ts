import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/constants';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private notificationCallback: ((notification: any) => void) | null = null;

  /**
   * Connect to Socket.IO server
   */
  async connect() {
    if (this.socket && this.isConnected) {
      console.warn('Socket already connected');
      return this.socket;
    }

    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        console.warn('No token available for Socket.IO connection');
        return null;
      }

      this.socket = io(BACKEND_URL, {
        auth: {
          token: token
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling']
      });

      this.setupConnectionHandlers();
      
      console.log('✅ Socket.IO connecting...');
      
      return this.socket;
    } catch (error) {
      console.error('❌ Socket connection error:', error);
      throw error;
    }
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', async () => {
      this.isConnected = true;
      console.log('✅ Socket connected:', this.socket?.id);
      
      // Join user room to receive notifications
      // Get userId from JWT token
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          // Decode JWT to get user ID (simple base64 decode, no verification needed for client)
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          const userId = payload.id || payload.userId || payload.sub;
          
          if (userId) {
            this.socket?.emit('join', userId);
            console.log('✅ Joined user room:', userId);
          } else {
            console.warn('⚠️ No userId found in token');
          }
        }
      } catch (error) {
        console.error('❌ Failed to join user room:', error);
      }
      
      // Listen for new notifications
      this.setupNotificationListener();
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });
  }

  /**
   * Setup notification listener
   */
  private setupNotificationListener() {
    if (!this.socket) return;

    this.socket.on('new_notification', (notification) => {
      console.log('📬 New notification received:', notification.title);
      console.log('📬 Notification type:', notification.type);
      console.log('📬 Full notification:', JSON.stringify(notification, null, 2));
      
      if (this.notificationCallback) {
        console.log('📬 Calling notification callback');
        this.notificationCallback(notification);
      } else {
        console.log('⚠️ No notification callback registered!');
      }
    });
  }

  /**
   * Set callback for new notifications
   */
  onNewNotification(callback: (notification: any) => void) {
    this.notificationCallback = callback;
    
    // If already connected, setup listener immediately
    if (this.socket && this.isConnected) {
      this.setupNotificationListener();
    }
  }

  /**
   * Remove notification callback
   */
  offNewNotification() {
    this.notificationCallback = null;
    if (this.socket) {
      this.socket.off('new_notification');
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.notificationCallback = null;
      console.log('✅ Socket disconnected');
    }
  }

  /**
   * Check if connected
   */
  isSocketConnected(): boolean {
    return this.socket !== null && this.isConnected;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;

