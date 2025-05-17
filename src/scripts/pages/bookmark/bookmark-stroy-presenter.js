import StoryIdb from '../../data/database';
import { showResponseMessage } from '../../utils/template';

class BookmarkStoryPresenter {
  constructor(view) {
    this._view = view;
    this._stories = [];
    this._boundHandleStoryDelete = this._handleStoryDelete.bind(this);
  }

  async init() {
    try {
      await this._loadStoriesFromIndexedDB();
      this._attachEventListeners();
    } catch (error) {
      console.error('Error initializing presenter:', error);
      showResponseMessage('Gagal memuat cerita tersimpan');
    }
  }

  async _loadStoriesFromIndexedDB() {
    try {
      this._stories = await StoryIdb.getAllStories();
      
      this._stories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      this._view.updateStoryList(this._stories);
    } catch (error) {
      console.error('Error loading stories from IndexedDB:', error);
      this._view.updateStoryList([]);
    }
  }

  _attachEventListeners() {
    document.removeEventListener('click', this._boundHandleStoryDelete);
    document.addEventListener('click', this._boundHandleStoryDelete);
  }

  async _handleStoryDelete(event) {
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
    document.removeEventListener('click', this._boundHandleStoryDelete);
  }
}

export default BookmarkStoryPresenter;
