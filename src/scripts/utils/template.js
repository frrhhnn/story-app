const createStoryItemTemplate = (story, isBookmarkPage = false) => `
  <div class="story-item">
    <div class="story-item__header">
      <img class="story-item__image lazyload" 
        src="${story.photoUrl}" 
        alt="Foto oleh ${story.name}" 
        crossorigin="anonymous"
        onerror="this.onerror=null; this.src='/images/placeholder.jpg';">
    </div>
    <div class="story-item__content">
      <h3 class="story-item__title">${story.name}</h3>
      <p class="story-item__description">${story.description}</p>
      <p class="story-item__date">${new Date(story.createdAt).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</p>
      <div class="story-item__action">
        ${isBookmarkPage ? 
          `<button class="btn btn-danger delete-story" data-story-id="${story.id}">
            <i class="fas fa-trash"></i> Hapus Cerita
          </button>` 
          : story.isSaved ?
          `<button class="btn btn-primary save-story" data-story-id="${story.id}" disabled>
            <i class="fas fa-bookmark"></i> Tersimpan
          </button>`
          : `<button class="btn btn-primary save-story" data-story-id="${story.id}">
            <i class="fas fa-bookmark"></i> Simpan Cerita
          </button>`
        }
      </div>
    </div>
  </div>
`;

const createStoryDetailTemplate = (story) => {
  if (!story) {
    return `
      <div class="error-container">
        <p class="error-message">Story tidak ditemukan</p>
        <a href="#/home" class="btn btn-primary">Kembali ke Beranda</a>
      </div>
    `;
  }

  return `
    <article class="story-detail">
      <div class="story-detail__content">
        <div class="story-detail__image-container">
          <img 
            class="story-detail__image lazyload" 
            data-src="${story.photoUrl}" 
            src="/images/placeholder.jpg"
            alt="Foto oleh ${story.name || 'Anonymous'}" 
            crossorigin="anonymous"
            onerror="this.onerror=null; this.src='/images/placeholder.jpg';"
          >
        </div>

        <div class="story-detail__header">
          <h2 class="story-detail__title">${story.name || 'Untitled Story'}</h2>
          <div class="story-detail__info">
            <p class="story-detail__description">${story.description || 'No description available'}</p>
          </div>
          
          <div class="story-detail__meta">
            <p class="story-detail__date">
              <i class="fas fa-calendar"></i>
              ${new Date(story.createdAt).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
            <p class="story-detail__author">
              <i class="fas fa-user"></i>
              ${story.name || 'Anonymous'}
            </p>
            ${story.lat && story.lon ? `
              <p class="story-detail__location">
                <i class="fas fa-map-marker-alt"></i>
                Lokasi: ${story.lat.toFixed(6)}, ${story.lon.toFixed(6)}
              </p>
            ` : ''}
          </div>
        </div>

        ${story.lat && story.lon ? `
          <div class="story-detail__map">
            <h3>Lokasi Story</h3>
            <div id="mapDetail" class="map-container" style="height: 300px;"></div>
          </div>
        ` : ''}
      </div>
    </article>
  `;
};

const createAddStoryFormTemplate = () => `
  <div class="add-story">
    <h2 class="add-story__title">Bagikan Ceritamu</h2>
    <form id="addStoryForm" novalidate>
      <div class="form-group">
        <label for="description">
          Deskripsi Cerita <span class="required">*</span>
        </label>
        <textarea 
          id="description" 
          name="description" 
          required 
          placeholder="Tulis deskripsi story kamu"
        ></textarea>
        <div class="form-validation-message" id="descriptionValidation"></div>
      </div>
      
      <div class="form-group">
        <h3>Foto Cerita <span class="required">*</span></h3>
        <div class="add-story__photo-section">
          <!-- Camera Option -->
          <div class="camera-container">
            <button type="button" id="startCamera" class="btn btn-secondary">
              <i class="fas fa-camera"></i> Buka Kamera
            </button>
            <video id="cameraPreview" autoplay playsinline></video>
            <canvas id="photoCanvas"></canvas>
            <button type="button" id="capturePhoto" class="btn btn-primary">
              <i class="fas fa-camera"></i> Ambil Foto
            </button>
          </div>

          <!-- Separator -->
          <div class="photo-or-text">atau</div>

          <!-- File Upload Option -->
          <div class="photo-input-container">
            <div class="file-upload-container">
              <input 
                type="file" 
                id="photoFile" 
                accept="image/*" 
                class="photo-file-input"
              >
              <label for="photoFile" class="btn btn-secondary">
                <i class="fas fa-upload"></i> Pilih File Foto
              </label>
            </div>
            <!-- Photo Preview -->
            <div id="photoPreview" class="photo-preview">
              <div class="preview-placeholder">
                <i class="fas fa-image"></i>
                <p>Preview foto akan muncul di sini</p>
              </div>
            </div>
            <div class="form-validation-message" id="photoValidation"></div>
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <h3>Lokasi <span class="required">*</span></h3>
        <div id="mapAdd" class="add-story__map"></div>
        <div class="location-info">
          <p>Lokasi Terpilih: <span id="selectedLocation">Belum dipilih</span></p>
          <div class="form-validation-message" id="locationValidation"></div>
        </div>
      </div>
      
      <div class="form-info">
        <p><span class="required">*</span> wajib diisi</p>
      </div>
      
      <button type="submit" class="btn btn-primary submit-button">
        <i class="fas fa-paper-plane"></i> Kirim Cerita
      </button>
    </form>
  </div>
`;

const createSkipLinkTemplate = () => `
  <a href="#mainContent" class="skip-link">Lewati ke Konten</a>
`;

const createNotificationButtonTemplate = () => `
  <button id="notificationToggle" class="notification-toggle" aria-label="Toggle Notifications">
    <i class="fas fa-bell"></i>
    <span class="notification-status">Aktifkan Notifikasi</span>
  </button>
`;

const createInstallButtonTemplate = () => `
  <button id="installButton" class="install-button hidden" aria-label="Install App">
    <i class="fas fa-download"></i>
    <span>Install App</span>
  </button>
`;

const createToastTemplate = (message) => `
  <div class="toast-container">
    <div class="toast-message">
      <p>${message}</p>
      <button class="toast-close" aria-label="Close notification">x</button>
    </div>
  </div>
`;

const showLoading = () => {
  const loadingElement = document.querySelector("#loading");
  loadingElement.style.display = "flex";
};

const hideLoading = () => {
  const loadingElement = document.querySelector("#loading");
  loadingElement.style.display = "none";
};

const showResponseMessage = (message = "Periksa koneksi internet Anda") => {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast-container');
  if (existingToast) {
    existingToast.remove();
  }

  // Create and append new toast
  document.body.insertAdjacentHTML('beforeend', createToastTemplate(message));
  
  const toastContainer = document.querySelector('.toast-container');
  const closeButton = toastContainer.querySelector('.toast-close');

  // Add animation class after a small delay to trigger animation
  setTimeout(() => {
    toastContainer.classList.add('show');
  }, 10);

  // Auto hide after 3 seconds
  const autoHideTimeout = setTimeout(() => {
    hideToast(toastContainer);
  }, 3000);

  // Handle manual close
  closeButton.addEventListener('click', () => {
    clearTimeout(autoHideTimeout);
    hideToast(toastContainer);
  });
};

const hideToast = (toastContainer) => {
  toastContainer.classList.remove('show');
  // Remove element after animation
  setTimeout(() => {
    toastContainer.remove();
  }, 300);
};

const initNavigationDrawer = () => {
  const hamburgerButton = document.querySelector("#hamburgerButton");
  const navigationDrawer = document.querySelector("#navigationDrawer");

  hamburgerButton.addEventListener("click", (event) => {
    event.stopPropagation();
    navigationDrawer.classList.toggle("open");
  });

  document.addEventListener("click", (event) => {
    if (event.target !== navigationDrawer && event.target !== hamburgerButton) {
      navigationDrawer.classList.remove("open");
    }
  });
};

// Template untuk story di halaman home
const createHomeStoryItemTemplate = (story) => `
  <div class="story-item">
    <div class="story-item__header">
      <img class="story-item__image lazyload" 
        src="${story.photoUrl}" 
        alt="Foto oleh ${story.name}" 
        crossorigin="anonymous"
        onerror="this.onerror=null; this.src='/images/placeholder.jpg';">
    </div>
    <div class="story-item__content">
      <h3 class="story-item__title">${story.name}</h3>
      <p class="story-item__description">${story.description}</p>
      <p class="story-item__date">${new Date(story.createdAt).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</p>
      <div class="story-item__action">
        ${story.isSaved ?
          `<button class="btn btn-primary save-story" data-story-id="${story.id}" disabled>
            <i class="fas fa-bookmark"></i> Tersimpan
          </button>`
          : `<button class="btn btn-primary save-story" data-story-id="${story.id}">
            <i class="fas fa-bookmark"></i> Simpan Cerita
          </button>`
        }
      </div>
    </div>
  </div>
`;

// Template untuk story di halaman bookmark
const createBookmarkStoryItemTemplate = (story) => `
  <div class="story-item bookmark-story">
    <div class="story-item__header">
      <img class="story-item__image lazyload" 
        src="${story.photoUrl}" 
        alt="Foto oleh ${story.name}" 
        crossorigin="anonymous"
        onerror="this.onerror=null; this.src='/images/placeholder.jpg';">
    </div>
    <div class="story-item__content">
      <h3 class="story-item__title">${story.name}</h3>
      <p class="story-item__description">${story.description}</p>
      <p class="story-item__date">${new Date(story.createdAt).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</p>
      <div class="story-item__action">
        <button class="btn btn-danger delete-story" data-story-id="${story.id}">
          <i class="fas fa-trash"></i> Hapus Cerita
        </button>
      </div>
    </div>
  </div>
`;

export {
  createStoryItemTemplate,
  createStoryDetailTemplate,
  createAddStoryFormTemplate,
  createSkipLinkTemplate,
  createNotificationButtonTemplate,
  createInstallButtonTemplate,
  showLoading,
  hideLoading,
  showResponseMessage,
  initNavigationDrawer,
  createHomeStoryItemTemplate,
  createBookmarkStoryItemTemplate,
};