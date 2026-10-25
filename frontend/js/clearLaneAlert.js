/**
 * SafeRoute - Clear Lane Alert Service
 * Real-time 350m emergency vehicle lane clearance warning system.
 */
const ClearLaneAlertService = {
  socket: null,
  activeAlert: null,
  isAcknowledged: false,
  isMuted: false,
  audioCtx: null,
  sirenOsc: null,
  sirenGain: null,
  sirenTimer: null,
  userCoords: null,

  elements: {},

  init() {
    this.elements = {
      container: document.getElementById('clearLaneAlertContainer'),
      card: document.getElementById('clearLaneCard'),
      distance: document.getElementById('clearLaneDistance'),
      vehicleNumber: document.getElementById('clearLaneVehicleNumber'),
      ambulanceName: document.getElementById('clearLaneAmbulanceName'),
      audioToggleBtn: document.getElementById('clearLaneAudioToggleBtn'),
      audioIcon: document.getElementById('clearLaneAudioIcon'),
      acknowledgeBtn: document.getElementById('clearLaneAcknowledgeBtn'),
      miniBadge: document.getElementById('clearLaneMiniBadge'),
      miniDistance: document.getElementById('clearLaneMiniDistance'),
      passedToast: document.getElementById('clearLanePassedToast')
    };

    if (!this.elements.container) {
      console.warn('[CLEAR LANE] Alert container element not found in DOM.');
      return;
    }

    this.bindEvents();
    this.initSocket();
    this.detectInitialLocation();
  },

  bindEvents() {
    if (this.elements.acknowledgeBtn) {
      this.elements.acknowledgeBtn.addEventListener('click', () => {
        this.acknowledgeAlert();
      });
    }

    if (this.elements.miniBadge) {
      this.elements.miniBadge.addEventListener('click', () => {
        this.reopenAlert();
      });
    }

    if (this.elements.audioToggleBtn) {
      this.elements.audioToggleBtn.addEventListener('click', () => {
        this.toggleAudio();
      });
    }
  },

  initSocket() {
    const token = localStorage.getItem('saferoute_token');
    if (!token || typeof io === 'undefined') {
      console.warn('[CLEAR LANE] Socket.io or token not available.');
      return;
    }

    this.socket = io(window.location.origin, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('[CLEAR LANE] Real-time socket connected for lane-clear alerts.');
      if (this.userCoords) {
        this.emitLocation(this.userCoords.lat, this.userCoords.lng);
      }
    });

    // Main alert event: Ambulance on live mode within 350 meters
    this.socket.on('ambulance:clear_lane_alert', (data) => {
      console.log('[CLEAR LANE] 🚨 EMERGENCY CLEAR LANE ALERT RECEIVED:', data);
      this.handleIncomingAlert(data);
    });

    // Clearance event: Ambulance has passed or turned off live mode
    this.socket.on('ambulance:clear_lane_cleared', (data) => {
      console.log('[CLEAR LANE] ✅ Clearance notification received:', data);
      this.handleClearedAlert(data);
    });

    this.socket.on('disconnect', () => {
      console.log('[CLEAR LANE] Socket disconnected.');
    });
  },

  detectInitialLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.updateUserLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  },

  updateUserLocation(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    this.userCoords = { lat, lng };

    this.emitLocation(lat, lng);
  },

  emitLocation(lat, lng) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('user:location', { latitude: lat, longitude: lng });
    }

    // Background REST backup
    if (window.api && typeof window.api.fetch === 'function') {
      api.fetch('/auth/location', {
        method: 'PATCH',
        body: JSON.stringify({ latitude: lat, longitude: lng })
      }).catch(() => {});
    }
  },

  handleIncomingAlert(data) {
    this.activeAlert = data;
    const distanceMeters = Math.round(data.distanceMeters || 0);

    // Update text content
    if (this.elements.distance) {
      this.elements.distance.textContent = `${distanceMeters} m`;
    }
    if (this.elements.vehicleNumber) {
      this.elements.vehicleNumber.textContent = data.vehicleNumber || 'EMERGENCY UNIT';
    }
    if (this.elements.ambulanceName) {
      this.elements.ambulanceName.textContent = data.ambulanceName || 'SafeRoute Ambulance';
    }
    if (this.elements.miniDistance) {
      this.elements.miniDistance.textContent = `${distanceMeters} m away`;
    }

    // Update map marker and safety ring if MapService is active
    if (window.MapService && typeof window.MapService.showLiveAmbulance === 'function') {
      window.MapService.showLiveAmbulance(data);
    }

    // If user has not acknowledged yet, present full screen HUD
    if (!this.isAcknowledged) {
      this.showAlertHUD();
      this.startSirenSound();
    } else {
      // Keep mini badge active and updated
      this.showMiniBadge();
    }
  },

  handleClearedAlert(data) {
    this.stopSirenSound();
    this.hideAlertHUD();
    this.hideMiniBadge();
    this.isAcknowledged = false;

    // Remove map marker
    if (window.MapService && typeof window.MapService.hideLiveAmbulance === 'function') {
      window.MapService.hideLiveAmbulance(data?.ambulanceId);
    }

    // Show cleared celebration toast
    if (this.elements.passedToast) {
      this.elements.passedToast.classList.remove('hidden', '-translate-y-4', 'opacity-0');
      this.elements.passedToast.classList.add('translate-y-0', 'opacity-100');

      setTimeout(() => {
        this.elements.passedToast.classList.remove('translate-y-0', 'opacity-100');
        this.elements.passedToast.classList.add('-translate-y-4', 'opacity-0');
        setTimeout(() => this.elements.passedToast.classList.add('hidden'), 400);
      }, 4000);
    }

    this.activeAlert = null;
  },

  showAlertHUD() {
    if (!this.elements.container) return;
    this.elements.container.classList.remove('hidden', '-translate-y-6', 'opacity-0');
    this.elements.container.classList.add('translate-y-0', 'opacity-100');
  },

  hideAlertHUD() {
    if (!this.elements.container) return;
    this.elements.container.classList.remove('translate-y-0', 'opacity-100');
    this.elements.container.classList.add('-translate-y-6', 'opacity-0');
    setTimeout(() => {
      if (!this.activeAlert || this.isAcknowledged) {
        this.elements.container.classList.add('hidden');
      }
    }, 350);
  },

  showMiniBadge() {
    if (!this.elements.miniBadge) return;
    this.elements.miniBadge.classList.remove('hidden');
  },

  hideMiniBadge() {
    if (!this.elements.miniBadge) return;
    this.elements.miniBadge.classList.add('hidden');
  },

  acknowledgeAlert() {
    this.isAcknowledged = true;
    this.stopSirenSound();
    this.hideAlertHUD();
    this.showMiniBadge();
  },

  reopenAlert() {
    this.isAcknowledged = false;
    this.hideMiniBadge();
    this.showAlertHUD();
  },

  toggleAudio() {
    this.isMuted = !this.isMuted;
    if (this.elements.audioIcon) {
      this.elements.audioIcon.textContent = this.isMuted ? '🔇' : '🔊';
    }

    if (this.isMuted) {
      this.stopSirenSound();
    } else if (this.activeAlert && !this.isAcknowledged) {
      this.startSirenSound();
    }
  },

  /**
   * Synthesize real two-tone European/American emergency siren (960Hz / 770Hz)
   * Using Web Audio API so no audio assets need to be downloaded or fail.
   */
  startSirenSound() {
    if (this.isMuted) return;

    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtxClass) return;
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (this.sirenOsc) {
        return; // Already playing
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(960, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, this.audioCtx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();

      this.sirenOsc = osc;
      this.sirenGain = gain;

      // Oscillate between 960Hz and 770Hz every 420ms (classic emergency siren cycle)
      let highTone = true;
      this.sirenTimer = setInterval(() => {
        if (!this.sirenOsc || !this.audioCtx) return;
        highTone = !highTone;
        const targetFreq = highTone ? 960 : 770;
        this.sirenOsc.frequency.exponentialRampToValueAtTime(targetFreq, this.audioCtx.currentTime + 0.15);
      }, 420);

    } catch (e) {
      console.warn('[CLEAR LANE] Web Audio siren error:', e);
    }
  },

  stopSirenSound() {
    if (this.sirenTimer) {
      clearInterval(this.sirenTimer);
      this.sirenTimer = null;
    }

    if (this.sirenOsc) {
      try {
        if (this.sirenGain && this.audioCtx) {
          this.sirenGain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
        }
        setTimeout(() => {
          if (this.sirenOsc) {
            try { this.sirenOsc.stop(); this.sirenOsc.disconnect(); } catch (_) {}
            this.sirenOsc = null;
          }
        }, 120);
      } catch (e) {
        this.sirenOsc = null;
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ClearLaneAlertService.init();
});
