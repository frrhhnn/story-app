import { openDB } from 'idb';
import CONFIG from '../config';

const { DATABASE_NAME, DATABASE_VERSION, OBJECT_STORE_NAME } = CONFIG;

const StoryIdb = {
  async getDatabase() {
    return openDB(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(database) {
        // Create the object store if it doesn't exist
        if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
          database.createObjectStore(OBJECT_STORE_NAME, { 
            keyPath: 'id' 
          });
        }
      },
    });
  },

  async getAllStories() {
    try {
      const db = await this.getDatabase();
      const tx = db.transaction(OBJECT_STORE_NAME, 'readonly');
      const store = tx.objectStore(OBJECT_STORE_NAME);
      return await store.getAll();
    } catch (error) {
      console.error('Error getting all stories:', error);
      return [];
    }
  },

  async putStory(story) {
    try {
      const db = await this.getDatabase();
      const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(OBJECT_STORE_NAME);
      await store.put(story);
      await tx.done;
      return true;
    } catch (error) {
      console.error('Error putting story:', error);
      return false;
    }
  },

  async getStory(id) {
    if (!id) {
      console.error('Story ID is required');
      return null;
    }

    try {
      console.log('Getting story from IndexedDB with ID:', id);
      const db = await this.getDatabase();
      const tx = db.transaction(OBJECT_STORE_NAME, 'readonly');
      const store = tx.objectStore(OBJECT_STORE_NAME);
      const story = await store.get(id);
      console.log('Story from IndexedDB:', story);
      return story;
    } catch (error) {
      console.error('Error getting story:', error);
      return null;
    }
  },

  async deleteStory(id) {
    try {
      const db = await this.getDatabase();
      const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(OBJECT_STORE_NAME);
      await store.delete(id);
      await tx.done;
      return true;
    } catch (error) {
      console.error('Error deleting story:', error);
      return false;
    }
  },

  async clearStories() {
    try {
      const db = await this.getDatabase();
      const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(OBJECT_STORE_NAME);
      await store.clear();
      await tx.done;
      return true;
    } catch (error) {
      console.error('Error clearing stories:', error);
      return false;
    }
  },

  async searchStories(query) {
    try {
      const stories = await this.getAllStories();
      return stories.filter((story) => {
        const loweredQuery = query.toLowerCase();
        return (
          story.description?.toLowerCase().includes(loweredQuery) ||
          story.name?.toLowerCase().includes(loweredQuery)
        );
      });
    } catch (error) {
      console.error('Error searching stories:', error);
      return [];
    }
  }
};

export default StoryIdb;