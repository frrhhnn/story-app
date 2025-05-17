import AuthAPI from '../data/authAPI';
import storyAPI from '../data/storyAPI';
import CONFIG from '../config';
import { showResponseMessage } from './template';

const NotificationHelper = {
  async init() {
    if (!this.isSupportedBrowser()) {
      console.log('Notification not supported in this browser');
      return false;
    }
    return true;
  },

  isSupportedBrowser() {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  },

  async requestPermission() {
    if (!this.isSupportedBrowser()) {
      showResponseMessage('Browser Anda tidak mendukung notifikasi');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      if (result === 'denied') {
        console.log('Notification permission denied');
        showResponseMessage('Izin notifikasi ditolak oleh browser');
        return false;
      }
      if (result === 'default') {
        console.log('Notification permission dismissed');
        showResponseMessage('Izin notifikasi belum diberikan');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      showResponseMessage('Gagal meminta izin notifikasi');
      return false;
    }
  },

  async registerServiceWorker() {
    if (!this.isSupportedBrowser()) {
      return null;
    }

    try {
      // Use relative path for service worker
      const swPath = './sw.js';
      const registration = await navigator.serviceWorker.register(swPath, {
        scope: './'
      });
      console.log('Service Worker registered successfully');
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      showResponseMessage('Gagal mendaftarkan service worker: ' + error.message);
      return null;
    }
  },

  async toggleNotification() {
    try {
      console.log('Starting notification toggle...');
      
      // Check browser support
      if (!this.isSupportedBrowser()) {
        showResponseMessage('Browser tidak mendukung notifikasi');
        return { success: false, message: 'Browser tidak mendukung notifikasi' };
      }

      // Check current permission status
      if (Notification.permission === 'denied') {
        showResponseMessage('Notifikasi telah diblokir oleh browser. Harap izinkan notifikasi di pengaturan browser.');
        return { success: false, message: 'Notifikasi telah diblokir oleh browser' };
      }

      // Get service worker registration
      let registration = await navigator.serviceWorker.ready;
      if (!registration) {
        registration = await this.registerServiceWorker();
        if (!registration) {
          return { success: false, message: 'Gagal mendaftarkan service worker' };
        }
      }
      
      console.log('Service Worker ready for notification toggle');
      
      // Check subscription status
      const subscription = await registration.pushManager.getSubscription();
      console.log('Current subscription:', subscription);

      if (subscription) {
        // Unsubscribe if already subscribed
        try {
          console.log('Attempting to unsubscribe...');
          
          // Unsubscribe from server first
          const unsubResult = await AuthAPI.unsubscribePushNotification(subscription);
          console.log('Server unsubscribe result:', unsubResult);
          
          if (!unsubResult.error) {
            // Then unsubscribe in browser
            await subscription.unsubscribe();
            console.log('Successfully unsubscribed from browser');
            
            showResponseMessage('Notifikasi berhasil dinonaktifkan');
            return { success: true, subscribed: false };
          } else {
            throw new Error(unsubResult.message);
          }
        } catch (error) {
          console.error('Failed to unsubscribe:', error);
          showResponseMessage('Gagal menonaktifkan notifikasi: ' + error.message);
          return { success: false, message: 'Gagal menonaktifkan notifikasi' };
        }
      }

      // Subscribe if not yet subscribed
      try {
        console.log('Attempting to subscribe...');
        
        // Request permission if not granted
        if (Notification.permission === 'default') {
          console.log('Requesting notification permission...');
          const permission = await Notification.requestPermission();
          console.log('Permission result:', permission);
          
          if (permission !== 'granted') {
            showResponseMessage('Izin notifikasi ditolak');
            return { success: false, message: 'Izin notifikasi ditolak' };
          }
        }

        // Ensure VAPID key is valid
        const applicationServerKey = this.urlBase64ToUint8Array(CONFIG.PUSH_MSG_VAPID_PUBLIC_KEY);
        console.log('Application Server Key:', applicationServerKey);

        // Subscribe to push manager
        console.log('Subscribing to push manager...');
        const pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
        console.log('Push subscription created:', pushSubscription);
        
        // Send subscription to server
        const subResult = await AuthAPI.subscribePushNotification(pushSubscription);
        console.log('Server subscription result:', subResult);
        
        if (!subResult.error) {
          showResponseMessage('Notifikasi berhasil diaktifkan');
          
          // Show browser notification on successful activation
          await registration.showNotification('StoryApp Notification', {
            body: 'Notifikasi berhasil diaktifkan! 🎉 Anda akan menerima pemberitahuan ketika ada story baru.',
            icon: './favicon.png',
            badge: './favicon.png',
            vibrate: [100, 50, 100],
            tag: 'subscription-success',
            data: {
              dateOfArrival: Date.now(),
              url: window.location.origin,
              type: 'subscription-success'
            },
            actions: [
              {
                action: 'ok',
                title: 'OK'
              }
            ]
          });
          
          return { success: true, subscribed: true };
        } else {
          // If server fails, unsubscribe from browser
          await pushSubscription.unsubscribe();
          throw new Error(subResult.message);
        }
      } catch (error) {
        console.error('Failed to subscribe:', error);
        showResponseMessage('Gagal mengaktifkan notifikasi: ' + error.message);
        return { success: false, message: 'Gagal mengaktifkan notifikasi: ' + error.message };
      }
    } catch (error) {
      console.error('Error in toggleNotification:', error);
      showResponseMessage('Terjadi kesalahan saat mengatur notifikasi');
      return { success: false, message: 'Terjadi kesalahan saat mengatur notifikasi' };
    }
  },

  async sendTestNotification() {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (Notification.permission === 'granted') {
        await registration.showNotification('Story App Notification', {
          body: 'Notifikasi berhasil diaktifkan! Anda akan menerima pemberitahuan ketika ada story baru.',
          icon: '/favicon.png',
          badge: '/favicon.png',
          vibrate: [100, 50, 100],
          data: {
            dateOfArrival: Date.now(),
            url: window.location.origin
          }
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  },

  // Send notification for new stories
  async sendNotification({ title, options }) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (!registration.pushManager) {
        console.log('PushManager not available');
        return;
      }

      // Check if user is subscribed
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        console.log('User not subscribed to notifications');
        return;
      }

      if (Notification.permission !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }

      // Send message to service worker
      registration.active.postMessage({
        type: 'PUSH_NOTIFICATION',
        data: {
          title,
          options: {
            ...options,
            icon: options.icon || '/favicon.png',
            badge: options.badge || '/favicon.png',
            vibrate: options.vibrate || [100, 50, 100],
            data: {
              ...(options.data || {}),
              timestamp: Date.now()
            }
          }
        }
      });

      console.log('Notification message sent to SW:', { title, options });
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  },

  // Convert VAPID key from base64 to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },
};

export default NotificationHelper;
