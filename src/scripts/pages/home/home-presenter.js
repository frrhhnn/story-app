import StoryAPI from "../../data/storyAPI.js";
import StoryIdb from "../../data/database.js";
import {
  createStoryItemTemplate,
  showLoading,
  hideLoading,
  showResponseMessage,
} from "../../utils/template";
import AuthAPI from "../../data/authAPI.js";
import NetworkStatus from "../../utils/network-status";
import CONFIG from "../../config";
import NotificationHelper from "../../utils/notification-helper.js";

class HomePresenter {
  constructor(view) {
    console.log('HomePresenter constructor called with view:', view);
    this._view = view;
    this._stories = [];
    this._map = null;
    this._markers = [];
    this._isInitialized = false;
    this._refreshInterval = null;
    this._refreshRate = 10000; // Refresh every 10 seconds
    this._isFetching = false;
    this._lastFetchedStoryId = null;

    // Bind event handlers
    this._handleStoryAdded = this._handleStoryAdded.bind(this);
    this._boundVisibilityChange = this._handleVisibilityChange.bind(this);
    this._boundHandleStorySave = this._handleStorySave.bind(this);
  }

  async init() {
    console.log('Initializing HomePresenter');
    showLoading();

    try {
      // Initialize listeners
      this._initOnlineListener();
      this._initStoryAddedListener();
      this._initVisibilityListener();
      this._initSaveStoryListener();
      this._startPeriodicRefresh();

      // Load initial data
      await this._fetchFreshData();
      
      // Initialize map after data is loaded
      await this._initMap();
      this._isInitialized = true;
    } catch (error) {
      console.error('Error in init:', error);
      showResponseMessage('Gagal memuat cerita: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  _initOnlineListener() {
    console.log('Initializing online listener');
    this._onlineCallback = async (isOnline) => {
      console.log('Network status changed:', isOnline ? 'online' : 'offline');
      if (isOnline) {
        console.log('Device is online, refreshing data...');
        this._view.hideOfflineIndicator();
        await this._fetchFreshData();
      } else {
        console.log('Device is offline, showing indicator');
        this._view.showOfflineIndicator();
        this._view.showEmptyMessage(); // ✅ tampilkan pesan offline
        this._stories = []; // Kosongkan daftar
        this._updateMap(); // Bersihkan peta
      }
    };
    NetworkStatus.registerCallback(this._onlineCallback);
  }  

  _initStoryAddedListener() {
    console.log('Initializing story-added event listener');
    window.removeEventListener('story-added', this._handleStoryAdded);
    window.addEventListener('story-added', this._handleStoryAdded);
    console.log('Story-added event listener registered successfully');
  }

  _initVisibilityListener() {
    document.addEventListener('visibilitychange', this._boundVisibilityChange);
  }

  _initSaveStoryListener() {
    document.addEventListener('click', this._boundHandleStorySave);
  }

  _handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      console.log('Page became visible, refreshing data...');
      this._fetchFreshData(true);
    }
  }

  _startPeriodicRefresh() {
    console.log('Starting periodic refresh...');
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
    }

    this._refreshInterval = setInterval(async () => {
      if (NetworkStatus.isOnline() && document.visibilityState === 'visible' && !this._isFetching) {
        console.log('Performing periodic refresh...');
        await this._fetchFreshData(true);
      }
    }, this._refreshRate);
  }

  _stopPeriodicRefresh() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  }

  async _handleStoryAdded(event) {
    console.log('Story added event received:', event.detail);
    
    try {
      if (!event.detail?.story) {
        throw new Error('Invalid story data received');
      }

      // Add the new story to the list
      this._stories.unshift(event.detail.story);
      
      // Update the view
      this._view.updateStoryList(this._stories);
      
      // Update map if initialized
      if (this._map) {
        this._updateMap();
      }

      // Fetch fresh data in the background without blocking
      this._fetchFreshData().catch(error => {
        console.warn('Background data refresh failed:', error);
      });
    } catch (error) {
      console.error('Error handling new story:', error);
      showResponseMessage('Terjadi kesalahan saat memperbarui daftar cerita: ' + (error.message || 'Unknown error'));
    }
  }

  async _fetchFreshData() {
    try {
      if (!StoryAPI) {
        throw new Error('StoryAPI is not initialized');
      }

      if (!NetworkStatus.isOnline()) {
        console.log('Device is offline, showing empty state');
        this._stories = [];
        this._view.showEmptyMessage();
        return;
      }

      console.log('Fetching fresh data...');
      this._isFetching = true;

      const response = await StoryAPI.getAllStories();
      
      if (!response.error && response.data?.stories) {
        // Get saved stories from IndexedDB to check saved state
        const savedStories = await StoryIdb.getAllStories();
        const savedStoryIds = new Set(savedStories.map(story => story.id));

        // Mark stories that are saved
        this._stories = response.data.stories.map(story => ({
          ...story,
          isSaved: savedStoryIds.has(story.id)
        }));

        // Sort stories by creation date (newest first)
        this._stories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Update UI
        if (this._view && typeof this._view.updateStoryList === 'function') {
          this._view.updateStoryList(this._stories);
        }

        if (!this._isInitialized) {
          await this._initMap();
          this._isInitialized = true;
        } else {
          this._updateMap();
        }
      } else {
        throw new Error(response.message || 'Failed to fetch stories');
      }
    } catch (error) {
      console.error('Error fetching fresh data:', error);
      this._stories = [];
      if (this._view && typeof this._view.showEmptyMessage === 'function') {
        this._view.showEmptyMessage();
      }
    } finally {
      this._isFetching = false;
    }
  }

  async _notifyNewStories(newStories) {
    try {
      // Cek apakah notifikasi diizinkan
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        console.log('User not subscribed to notifications');
        return;
      }

      // Kirim notifikasi untuk setiap story baru (reverse order agar yang terbaru muncul terakhir)
      for (const story of [...newStories].reverse()) {
        await NotificationHelper.sendNotification({
          title: 'Story Baru dari ' + story.name,
          options: {
            body: story.description.substring(0, 100) + (story.description.length > 100 ? '...' : ''),
            icon: story.photoUrl || '/favicon.png',
            badge: '/favicon.png',
            tag: `new-story-${story.id}`, // Unique tag per story
            renotify: true,
            timestamp: new Date(story.createdAt).getTime(),
            data: {
              url: `/#/detail/${story.id}`,
              storyId: story.id,
              createdAt: story.createdAt,
            },
            vibrate: [100, 50, 100],
            actions: [
              {
                action: 'view',
                title: 'Lihat Story'
              },
              {
                action: 'close',
                title: 'Tutup'
              }
            ]
          }
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async _loadFromIndexedDB() {
    try {
      const stories = await StoryIdb.getAllStories();
      if (stories.length > 0) {
        console.log('Loading stories from IndexedDB:', stories.length);
        this._stories = stories.map(story => ({
          ...story,
          isSaved: true
        }));
        
        if (this._view && typeof this._view.updateStoryList === 'function') {
          this._view.updateStoryList(this._stories);
        }
        
        if (!this._isInitialized) {
          await this._initMap();
          this._isInitialized = true;
        } else {
          this._updateMap();
        }
      } else {
        console.log('No stories found in IndexedDB');
        this._stories = [];
        if (this._view && typeof this._view.showEmptyMessage === 'function') {
          this._view.showEmptyMessage();
        }
      }
    } catch (error) {
      console.error('Error loading from IndexedDB:', error);
      showResponseMessage('Gagal memuat data dari penyimpanan lokal');
    }
  }

  async handleSearch(query) {
    showLoading();
    try {
      let stories;
      if (query) {
        stories = await StoryIdb.searchStories(query);
      } else {
        stories = await StoryIdb.getAllStories();
      }

      // Sort stories by creation date (newest first)
      this._stories = stories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      this._view.updateStoryList(this._stories);
      this._updateMap();
    } catch (error) {
      this._showError("Gagal mencari cerita: " + error.message);
    } finally {
      hideLoading();
    }
  }

  _showError(message) {
    showResponseMessage(message);
  }

  async _initMap() {
    try {
      const mapContainer = document.querySelector("#storiesMap");
      if (!mapContainer) {
        console.warn('Map container not found, waiting for container...');
        // Wait for the container to be available
        await new Promise(resolve => {
          const observer = new MutationObserver((mutations, obs) => {
            const container = document.querySelector("#storiesMap");
            if (container) {
              obs.disconnect();
              resolve();
            }
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        });
      }
      
      // Clean up existing map if any
      if (this._map) {
        this._map.remove();
        this._map = null;
        this._markers = [];
      }

      console.log('Initializing map...');
      
      // Configure default icon
      L.Icon.Default.prototype.options.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';
      
      this._map = L.map("storiesMap", {
        minZoom: 2,
        maxZoom: 18,
        zoomControl: true,
        attributionControl: true
      }).setView([-2.548926, 118.014863], 5);

      const baseLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }
      ).addTo(this._map);

      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
          maxZoom: 18,
        }
      );

      const topoLayer = L.tileLayer(
        "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        {
          attribution:
            'Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a>',
          maxZoom: 17,
        }
      );

      const baseLayers = {
        "Peta Jalan": baseLayer,
        Satelit: satelliteLayer,
        Topografi: topoLayer,
      };

      L.control.layers(baseLayers).addTo(this._map);
      
      // Force a resize event to ensure proper rendering
      setTimeout(() => {
        this._map.invalidateSize();
      }, 100);

      console.log('Map initialized successfully');
      this._updateMap();
    } catch (error) {
      console.error('Error initializing map:', error);
      throw error;
    }
  }

  _updateMap() {
    if (!this._map) return;
    
    // Clear existing markers
    if (this._markers.length > 0) {
      this._markers.forEach(marker => marker.remove());
      this._markers = [];
    }

    // Add new markers
    this._stories.forEach((story) => {
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon]).addTo(this._map);
        marker.bindPopup(`
          <div class="marker-popup">
            <h3>${story.name}</h3>
            <img src="${story.photoUrl}" alt="Foto oleh ${story.name}" style="width: 100px;">
            <p>${story.description.substring(0, 100)}${
          story.description.length > 100 ? "..." : ""
        }</p>
            <a href="#/detail/${story.id}">Lihat Detail</a>
          </div>
        `);
        this._markers.push(marker);
      }
    });

    // Fit bounds if there are markers
    if (this._markers.length > 0) {
      const group = L.featureGroup(this._markers);
      this._map.fitBounds(group.getBounds());
    }
  }

  async _handleStorySave(event) {
    const saveButton = event.target.closest('.save-story');
    if (!saveButton) return;

    const storyId = saveButton.dataset.storyId;
    if (!storyId) return;

    try {
      const story = this._stories.find(s => s.id === storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      // Check if story is already saved
      const existingStory = await StoryIdb.getStory(storyId);
      if (existingStory) {
        showResponseMessage('Cerita sudah tersimpan sebelumnya');
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-check"></i> Tersimpan';
        return;
      }

      // Try to fetch and store the image as blob
      try {
        const imageResponse = await fetch(story.photoUrl);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const imageUrl = URL.createObjectURL(imageBlob);
          story.photoUrl = imageUrl;
        }
      } catch (imageError) {
        console.warn('Failed to fetch image, using default placeholder:', imageError);
        story.photoUrl = '/images/placeholder.jpg';
      }

      const success = await StoryIdb.putStory(story);
      if (success) {
        showResponseMessage('Cerita berhasil disimpan');
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-check"></i> Tersimpan';
        story.isSaved = true;
      } else {
        throw new Error('Failed to save story');
      }
    } catch (error) {
      console.error('Error saving story:', error);
      showResponseMessage('Gagal menyimpan cerita: ' + error.message);
    }
  }

  async _updateSaveButtonStates() {
    try {
      const savedStories = JSON.parse(localStorage.getItem('savedStories') || '{}');
      const buttons = document.querySelectorAll('.save-story');
      
      for (const button of buttons) {
        const storyId = button.dataset.storyId;
        if (savedStories[storyId]) {
          button.disabled = true;
          button.innerHTML = '<i class="fas fa-check"></i> Tersimpan';
        }
      }
    } catch (error) {
      console.error('Error updating save button states:', error);
    }
  }

  async _renderStories() {
    if (!this._map) return;
    
    // Clear existing markers
    if (this._markers.length > 0) {
      this._markers.forEach(marker => marker.remove());
      this._markers = [];
    }

    // Add new markers
    this._stories.forEach((story) => {
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon]).addTo(this._map);
        marker.bindPopup(`
          <div class="marker-popup">
            <h3>${story.name}</h3>
            <img src="${story.photoUrl}" alt="Foto oleh ${story.name}" style="width: 100px;">
            <p>${story.description.substring(0, 100)}${
          story.description.length > 100 ? "..." : ""
        }</p>
          </div>
        `);
        this._markers.push(marker);
      }
    });

    // Update save button states after rendering stories
    await this._updateSaveButtonStates();

    // Fit bounds if there are markers
    if (this._markers.length > 0) {
      const group = L.featureGroup(this._markers);
      this._map.fitBounds(group.getBounds());
    }
  }

  destroy() {
    console.log('Destroying HomePresenter');
    NetworkStatus.unregisterCallback(this._onlineCallback);
    window.removeEventListener('story-added', this._handleStoryAdded);
    document.removeEventListener('visibilitychange', this._boundVisibilityChange);
    document.removeEventListener('click', this._boundHandleStorySave);
    this._stopPeriodicRefresh();
    
    if (this._map) {
      this._map.remove();
      this._map = null;
    }
    this._markers = [];
    this._isInitialized = false;
  }
}

export default HomePresenter;