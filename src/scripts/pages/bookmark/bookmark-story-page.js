import BookmarkStoryPresenter from './bookmark-stroy-presenter';
import StoryIdb from '../../data/database';
import { createBookmarkStoryItemTemplate, showResponseMessage } from '../../utils/template';

class BookmarkStoryPage {
  constructor() {
    this._stories = [];
    this._presenter = null;
  }

  async render() {
    return `
      <section class="content" id="mainContent" tabindex="0">
        <h2 class="content__heading">Cerita Tersimpan</h2>
        <div id="stories" class="stories"></div>
      </section>
    `;
  }

  async afterRender() {
    try {
      if (!this._presenter) {
        this._presenter = new BookmarkStoryPresenter(this);
      }
      await this._presenter.init();
    } catch (error) {
      console.error('Error in afterRender:', error);
      showResponseMessage('Error initializing page: ' + error.message);
    }
  }

  updateStoryList(stories) {
    this._stories = stories;
    this._renderStories();
  }

  _renderStories() {
    const container = document.querySelector("#stories");
    if (!container) {
      console.error('Stories container not found!');
      return;
    }

    container.innerHTML = "";

    if (!this._stories || this._stories.length === 0) {
      container.innerHTML = '<div class="no-results">Tidak ada cerita tersimpan</div>';
      return;
    }

    this._stories.forEach((story) => {
      container.innerHTML += createBookmarkStoryItemTemplate(story);
    });
  }
}

export default BookmarkStoryPage;
