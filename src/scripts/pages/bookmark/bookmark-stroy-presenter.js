import StoryIdb from '../../data/database';
import { showResponseMessage } from '../../utils/template';

class BookmarkStoryPresenter {
  constructor(view) {
    this._view = view;
    this._stories = [];
    this._boundHandleStoryDelete = this._handleStoryDelete.bind(this);
    this._isDestroyed = false;
  }

  async init() {
    try {
      if (this._isDestroyed) return;
      await this._loadStoriesFromIndexedDB();
      this._attachEventListeners();
    } catch (error) {
      console.error('Error initializing presenter:', error);
      showResponseMessage('Gagal memuat cerita tersimpan');
    }
  }

  async _loadStoriesFromIndexedDB() {
    try {
      if (this._isDestroyed) return;
      
      // Only load stories from IndexedDB, never from API
      this._stories = await StoryIdb.getAllStories();
      
      // Sort by creation date (newest first)
      this._stories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      if (!this._isDestroyed) {
        this._view.updateStoryList(this._stories);
      }
    } catch (error) {
      console.error('Error loading stories from IndexedDB:', error);
      if (!this._isDestroyed) {
        this._view.updateStoryList([]);
      }
    }
  }

  _attachEventListeners() {
    if (this._isDestroyed) return;
    
    // Remove existing listener first to prevent duplicates
    document.removeEventListener('click', this._boundHandleStoryDelete);
    document.addEventListener('click', this._boundHandleStoryDelete);

    // Add visibility change listener to refresh data when tab becomes visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this._isDestroyed) {
        this._loadStoriesFromIndexedDB();
      }
    });
  }

  async _handleStoryDelete(event) {
    if (this._isDestroyed) return;

    const deleteButton = event.target.closest('.delete-story');
    if (!deleteButton) return;

    const storyId = deleteButton.dataset.storyId;
    if (!storyId) return;

    try {
      const success = await StoryIdb.deleteStory(storyId);
      if (success) {
        showResponseMessage('Cerita berhasil dihapus');
        await this._loadStoriesFromIndexedDB();
      } else {
        throw new Error('Gagal menghapus cerita');
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      showResponseMessage('Gagal menghapus cerita: ' + error.message);
    }
  }

  destroy() {
    this._isDestroyed = true;
    document.removeEventListener('click', this._boundHandleStoryDelete);
    document.removeEventListener('visibilitychange', this._loadStoriesFromIndexedDB);
  }
}

export default BookmarkStoryPresenter;
