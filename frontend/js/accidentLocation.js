const AccidentLocationService = {
  selectedLat: null,
  selectedLng: null,
  isConfirmed: false,

  init() {
    this.accLatDisplay = document.getElementById('accLatDisplay');
    this.accLngDisplay = document.getElementById('accLngDisplay');
    this.useCurrentLocationBtn = document.getElementById('useCurrentLocationForAccidentBtn');
    this.confirmBtn = document.getElementById('confirmAccidentLocationBtn');
    this.messageDiv = document.getElementById('accidentMessage');

    this.bindEvents();
    
    // Once MapService is loaded (it is called sequentially in userDashboard.js), bind the map click listener
    MapService.setMapClickListener((lat, lng) => {
      this.handleLocationSelected(lat, lng);
    });
  },

  bindEvents() {
    this.useCurrentLocationBtn.addEventListener('click', () => this.handleUseCurrentLocation());
    this.confirmBtn.addEventListener('click', () => this.handleConfirm());
  },

  handleLocationSelected(lat, lng) {
    this.selectedLat = lat;
    this.selectedLng = lng;
    this.isConfirmed = false;
    
    // Update UI text
    this.accLatDisplay.textContent = lat.toFixed(6);
    this.accLngDisplay.textContent = lng.toFixed(6);
    
    // Hide any previous messages
    this.hideMessage();
    
    // Reset confirm button state
    this.resetConfirmButton();

    // Update Map Marker
    MapService.updateAccidentLocation(lat, lng);
  },

  handleUseCurrentLocation() {
    this.useCurrentLocationBtn.disabled = true;
    this.useCurrentLocationBtn.innerHTML = 'Locating...';
    this.hideMessage();

    if (!navigator.geolocation) {
      this.showMessage('Geolocation is not supported by your browser', 'error');
      this.resetCurrentLocationBtn();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        this.handleLocationSelected(lat, lng);
        
        // Also pan map to location
        if (MapService.map) {
          MapService.map.panTo({ lat, lng });
        }
        
        this.resetCurrentLocationBtn();
      },
      (error) => {
        let msg = 'Failed to get location';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please select location manually on the map.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable.';
        }
        this.showMessage(msg, 'error');
        this.resetCurrentLocationBtn();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  },

  handleConfirm() {
    if (!this.selectedLat || !this.selectedLng) {
      this.showMessage('Please select an accident location on the map first.', 'error');
      return;
    }

    this.isConfirmed = true;
    
    // Update UI to show confirmed state
    this.confirmBtn.innerHTML = 'Location Confirmed';
    this.confirmBtn.classList.remove('bg-rose-600', 'hover:bg-rose-500');
    this.confirmBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
    
    this.showMessage('Accident location confirmed! Coordinates are saved for the next step.', 'success');
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
  },

  resetCurrentLocationBtn() {
    this.useCurrentLocationBtn.disabled = false;
    this.useCurrentLocationBtn.innerHTML = 'Pin My Current Location';
  },

  resetConfirmButton() {
    this.confirmBtn.innerHTML = 'Confirm Location';
    this.confirmBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
    this.confirmBtn.classList.add('bg-rose-600', 'hover:bg-rose-500');
  }
};
