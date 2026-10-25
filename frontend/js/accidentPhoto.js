const AccidentPhotoService = {
  selectedPhotoFile: null,
  maxSizeBytes: 5 * 1024 * 1024, // 5MB

  init() {
    this.photoInput = document.getElementById('accidentPhotoInput');
    this.addPhotoBtn = document.getElementById('addPhotoBtn');
    this.changePhotoBtn = document.getElementById('changePhotoBtn');
    this.removePhotoBtn = document.getElementById('removePhotoBtn');
    
    this.emptyState = document.getElementById('photoEmptyState');
    this.previewState = document.getElementById('photoPreviewState');
    this.photoPreview = document.getElementById('accidentPhotoPreview');
    this.messageDiv = document.getElementById('photoMessage');

    this.bindEvents();
  },

  bindEvents() {
    // Triggers hidden file input
    this.addPhotoBtn.addEventListener('click', () => this.photoInput.click());
    this.changePhotoBtn.addEventListener('click', () => this.photoInput.click());
    
    // Remove photo
    this.removePhotoBtn.addEventListener('click', () => this.removePhoto());
    
    // Handle file selection
    this.photoInput.addEventListener('change', (e) => this.handleFileSelect(e));
  },

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return; // User cancelled picker

    this.hideMessage();

    // Validate type
    if (!file.type.startsWith('image/')) {
      this.showMessage('Invalid file type. Please select an image.', 'error');
      this.photoInput.value = ''; // Reset
      return;
    }

    // Validate size
    if (file.size > this.maxSizeBytes) {
      this.showMessage('Image is too large. Maximum size is 5MB.', 'error');
      this.photoInput.value = ''; // Reset
      return;
    }

    // Read and display image
    const reader = new FileReader();
    reader.onload = (e) => {
      this.selectedPhotoFile = file;
      this.photoPreview.src = e.target.result;
      
      this.emptyState.classList.add('hidden');
      this.previewState.classList.remove('hidden');
      this.previewState.classList.add('flex');
    };
    
    reader.onerror = () => {
      this.showMessage('Failed to load image. Please try another one.', 'error');
    };

    reader.readAsDataURL(file);
  },

  removePhoto() {
    this.selectedPhotoFile = null;
    this.photoInput.value = '';
    this.photoPreview.src = '';
    
    this.previewState.classList.add('hidden');
    this.previewState.classList.remove('flex');
    this.emptyState.classList.remove('hidden');
    
    this.hideMessage();
  },

  showMessage(msg, type) {
    this.messageDiv.textContent = msg;
    this.messageDiv.classList.remove('hidden', 'bg-rose-500/10', 'border-rose-500/30', 'text-rose-400', 'bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400');
    
    if (type === 'error') {
      this.messageDiv.classList.add('bg-rose-500/10', 'border-rose-500/30', 'text-rose-400');
    } else {
      this.messageDiv.classList.add('bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400');
    }
  },

  hideMessage() {
    this.messageDiv.classList.add('hidden');
  }
};
