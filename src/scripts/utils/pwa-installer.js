const PWAInstaller = {
  init() {
    this._deferredPrompt = null;
    this._installPromptElement = document.getElementById('installPrompt');
    this._installButton = document.getElementById('installButton');
    this._closeInstallPrompt = document.getElementById('closeInstallPrompt');
    this._initListeners();
    this._checkStandalone();
  },

  _initListeners() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Store the event for later use
      this._deferredPrompt = e;
      // Show custom install prompt
      this._showInstallPromotion();
    });

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this._hideInstallPromotion();
      // Clear the deferredPrompt
      this._deferredPrompt = null;
    });

    // Handle close button click
    if (this._closeInstallPrompt) {
      this._closeInstallPrompt.addEventListener('click', () => {
        this._hideInstallPromotion();
      });
    }

    // Handle install button click
    if (this._installButton) {
      this._installButton.addEventListener('click', () => this.promptInstall());
    }

    // Periodically check installation eligibility
    setInterval(() => this._checkInstallEligibility(), 30000);
  },

  async _checkInstallEligibility() {
    if (await this.isPWAInstalled()) {
      this._hideInstallPromotion();
      return;
    }

    // Show prompt if deferred prompt exists and not already showing
    if (this._deferredPrompt && this._installPromptElement?.classList.contains('hidden')) {
      this._showInstallPromotion();
    }
  },

  _checkStandalone() {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      this._hideInstallPromotion();
      return true;
    }
    return false;
  },

  async promptInstall() {
    if (!this._deferredPrompt) {
      console.log('No installation prompt available');
      return;
    }

    try {
      // Show the browser's install prompt
      this._deferredPrompt.prompt();
      // Wait for user response
      const { outcome } = await this._deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      
      // Clear the deferredPrompt
      this._deferredPrompt = null;
      
      // Hide our custom prompt
      this._hideInstallPromotion();
    } catch (error) {
      console.error('Error during installation:', error);
      showResponseMessage('Gagal memasang aplikasi: ' + error.message);
    }
  },

  _showInstallPromotion() {
    if (this._installPromptElement && !this._checkStandalone()) {
      this._installPromptElement.classList.remove('hidden');
    }
  },

  _hideInstallPromotion() {
    if (this._installPromptElement) {
      this._installPromptElement.classList.add('hidden');
    }
  },

  async isPWAInstalled() {
    // Check if app is in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    // For iOS
    if (window.navigator.standalone === true) {
      return true;
    }
    // Check if installed via getInstalledRelatedApps()
    if ('getInstalledRelatedApps' in navigator) {
      try {
        const relatedApps = await navigator.getInstalledRelatedApps();
        return relatedApps.length > 0;
      } catch (error) {
        console.warn('Error checking installed related apps:', error);
      }
    }
    return false;
  }
};

export default PWAInstaller; 