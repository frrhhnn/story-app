import CONFIG from "../config.js";

class AuthAPI {
  constructor() {
    this.baseUrl = CONFIG.BASE_URL;
  }

  // Generic POST request for auth endpoints
  async #post(endpoint, body) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      
      const responseJson = await response.json();
      
      if (responseJson.error) {
        return { error: true, message: responseJson.message };
      }
      
      return { error: false, data: responseJson };
    } catch (error) {
      return { error: true, message: "Network Error" };
    }
  }

  // Register a new user
  async register({ name, email, password }) {
    if (!name || !email || !password) {
      return { error: true, message: "Please fill all required fields" };
    }
    
    if (password.length < 8) {
      return { error: true, message: "Password must be at least 8 characters" };
    }
    
    const response = await this.#post("/register", { name, email, password });
    return response;
  }

  // Login user and get token
  async login({ email, password }) {
    if (!email || !password) {
      return { error: true, message: "Please fill all required fields" };
    }
    
    const response = await this.#post("/login", { email, password });
    
    if (!response.error && response.data.loginResult) {
      // Store token in localStorage for subsequent requests
      localStorage.setItem("token", response.data.loginResult.token);
      localStorage.setItem("user", JSON.stringify({
        id: response.data.loginResult.userId,
        name: response.data.loginResult.name
      }));
    }
    
    return response;
  }

  // Check if user is logged in
  isLoggedIn() {
    return !!localStorage.getItem("token");
  }

  // Get current user token
  getToken() {
    return localStorage.getItem("token");
  }

  // Get current user data
  getUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }

  // Logout user
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return { error: false, message: "Logged out successfully" };
  }

  // Subscribe to push notifications
  async subscribePushNotification(subscription) {
    try {
      if (!subscription || !subscription.endpoint) {
        throw new Error('Invalid subscription object');
      }

      console.log('Sending subscription to server:', subscription);
      
      // Get subscription keys
      const subscriptionJson = subscription.toJSON();
      console.log('Subscription JSON:', subscriptionJson);

      const token = this.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      const response = await fetch(`${this.baseUrl}${CONFIG.PUSH_MSG_SUBSCRIBE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscriptionJson.keys.p256dh,
            auth: subscriptionJson.keys.auth
          }
        })
      });

      const responseJson = await response.json();
      console.log('Server subscription response:', responseJson);

      if (!responseJson.error) {
        console.log('Successfully subscribed on server');
        
        // Save subscription status locally
        localStorage.setItem('notificationSubscribed', 'true');
        return responseJson;
      } else {
        console.error('Server subscription failed:', responseJson.message);
        throw new Error(responseJson.message || 'Server subscription failed');
      }
    } catch (error) {
      console.error('Error subscribing to push notification:', error);
      return { 
        error: true, 
        message: error.message || 'Failed to subscribe to push notifications' 
      };
    }
  }

  // Unsubscribe from push notifications
  async unsubscribePushNotification(subscription) {
    try {
      if (!subscription || !subscription.endpoint) {
        throw new Error('Invalid subscription object');
      }

      console.log('Sending unsubscription to server for endpoint:', subscription.endpoint);
      
      const token = this.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.baseUrl}${CONFIG.PUSH_MSG_UNSUBSCRIBE_URL}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });

      const responseJson = await response.json();
      console.log('Server unsubscribe response:', responseJson);

      if (!responseJson.error) {
        console.log('Successfully unsubscribed from server');
        await this.notifyUnsubscription();
        
        // Remove subscription status locally
        localStorage.removeItem('notificationSubscribed');
      } else {
        console.error('Server unsubscription failed:', responseJson.message);
        throw new Error(responseJson.message || 'Server unsubscription failed');
      }

      return responseJson;
    } catch (error) {
      console.error('Error unsubscribing from push notification:', error);
      return { 
        error: true, 
        message: error.message || 'Failed to unsubscribe from push notifications' 
      };
    }
  }

  // Check if notifications are subscribed
  async isSubscribed() {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration.pushManager) {
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        localStorage.removeItem('notificationSubscribed');
        return false;
      }

      // If we have a subscription but no local storage flag, assume we're subscribed
      // This helps with page refreshes where localStorage might get cleared
      if (!localStorage.getItem('notificationSubscribed')) {
        localStorage.setItem('notificationSubscribed', 'true');
      }
      
      return true;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }
}

export default new AuthAPI();