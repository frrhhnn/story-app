import AddPresenter from "./add-presenter";
import { createAddStoryFormTemplate } from "../../utils/template";

class AddPage {
  constructor() {
    this._presenter = null;
    this._selectedLocation = null;
  }

  async render() {
    return createAddStoryFormTemplate();
  }

  async afterRender() {
    this._presenter = new AddPresenter({ view: this });
    this._initializeForm();
    this._initializeMap();
    this._initializeCameraHandlers();
    this._initializeFileUpload();
  }

  _initializeForm() {
    const form = document.querySelector("#addStoryForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const description = document.querySelector("#description").value;
        const location = this._selectedLocation ? this._selectedLocation.getLatLng() : null;
        
        await this._presenter.handleFormSubmit({
          description,
          location,
          photoFile: this._presenter._photoFile // Pass the photo file directly
        });
      });
    }
  }

  _initializeMap() {
    const mapContainer = document.querySelector("#mapAdd");
    if (!mapContainer) return;

    const map = L.map("mapAdd").setView([-2.548926, 118.014863], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Handle click events on map
    map.on("click", (e) => {
      if (this._selectedLocation) {
        this._selectedLocation.setLatLng(e.latlng);
      } else {
        this._selectedLocation = L.marker(e.latlng).addTo(map);
      }

      // Update UI to show selected location
      const locationInfo = document.querySelector("#selectedLocation");
      if (locationInfo) {
        locationInfo.textContent = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
      }
    });
  }

  _initializeFileUpload() {
    const dropZone = document.querySelector('.photo-input-container');
    const fileInput = document.querySelector('#photoFile');
    const preview = document.querySelector('#photoPreview');

    if (!dropZone || !fileInput || !preview) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
      });
    });

    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length) {
        fileInput.files = files;
        this._handleFileSelect(files[0]);
      }
    });

    // Handle file input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this._handleFileSelect(e.target.files[0]);
      }
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  _handleFileSelect(file) {
    const preview = document.querySelector('#photoPreview');
    if (!preview) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showResponseMessage('Mohon pilih file gambar');
      return;
    }

    // Store file in presenter
    this._presenter.setPhotoFile(file);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `
        <div class="photo-preview-content">
          <img src="${e.target.result}" alt="Preview foto">
          <button type="button" class="btn btn-danger remove-photo">
            <i class="fas fa-trash"></i> Hapus Foto
          </button>
        </div>
      `;

      // Add remove button handler
      const removeButton = preview.querySelector('.remove-photo');
      if (removeButton) {
        removeButton.addEventListener('click', () => {
          this._presenter.setPhotoFile(null);
          preview.innerHTML = `
            <div class="preview-placeholder">
              <i class="fas fa-image"></i>
              <p>Pratinjau foto akan muncul di sini</p>
            </div>
          `;
        });
      }
    };
    reader.readAsDataURL(file);
  }

  _initializeCameraHandlers() {
    const startCameraButton = document.querySelector("#startCamera");
    const captureButton = document.querySelector("#capturePhoto");
    const cameraPreview = document.querySelector("#cameraPreview");
    const photoCanvas = document.querySelector("#photoCanvas");
    const photoPreview = document.querySelector("#photoPreview");

    if (startCameraButton) {
      startCameraButton.addEventListener("click", () => {
        this._presenter.handleCameraButtonClick();
      });
    }

    if (captureButton) {
      captureButton.addEventListener("click", () => {
        if (!cameraPreview || !photoCanvas || !photoPreview) return;

        const context = photoCanvas.getContext("2d");
        photoCanvas.width = cameraPreview.videoWidth;
        photoCanvas.height = cameraPreview.videoHeight;
        context.drawImage(cameraPreview, 0, 0);

        photoCanvas.toBlob((blob) => {
          const photoUrl = URL.createObjectURL(blob);
          photoPreview.innerHTML = `
            <img src="${photoUrl}" alt="Captured photo">
            <button type="button" class="btn btn-danger remove-photo">
              <i class="fas fa-trash"></i> Hapus Foto
            </button>
          `;
          this._presenter.setPhotoFile(blob);

          // Add remove button handler
          const removeButton = photoPreview.querySelector('.remove-photo');
          if (removeButton) {
            removeButton.addEventListener('click', () => {
              this._presenter.setPhotoFile(null);
              photoPreview.innerHTML = `
                <div class="preview-placeholder">
                  <i class="fas fa-image"></i>
                  <p>Pratinjau foto akan muncul di sini</p>
                </div>
              `;
            });
          }
        }, "image/jpeg");

        this._presenter._stopMediaStream();
        this.updateCameraUI(false, true);
      });
    }
  }

  updateCameraUI(showCamera, hasPhoto) {
    const startButton = document.querySelector("#startCamera");
    const captureButton = document.querySelector("#capturePhoto");
    const preview = document.querySelector("#cameraPreview");

    if (startButton) {
      startButton.textContent = showCamera ? "Tutup Kamera" : "Buka Kamera";
    }

    if (captureButton) {
      captureButton.style.display = showCamera ? "block" : "none";
    }

    if (preview) {
      preview.style.display = showCamera ? "block" : "none";
      if (showCamera && this._presenter._stream) {
        preview.srcObject = this._presenter._stream;
      }
    }
  }

  setCameraStream(stream) {
    const preview = document.querySelector("#cameraPreview");
    if (preview && stream) {
      preview.srcObject = stream;
      preview.play();
    }
  }
}

export default AddPage;
