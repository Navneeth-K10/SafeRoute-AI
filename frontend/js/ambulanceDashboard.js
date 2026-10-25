const AmbulanceDashboardService = {
  async init() {
    this.statusBadge = document.getElementById('statusBadge');
    this.dashAmbulanceName = document.getElementById('dashAmbulanceName');
    this.dashVehicleNumber = document.getElementById('dashVehicleNumber');
    this.dashDriverName = document.getElementById('dashDriverName');
    this.dashPhone = document.getElementById('dashPhone');
    this.dashLat = document.getElementById('dashLat');
    this.dashLng = document.getElementById('dashLng');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
    this.initLiveMode();
    await this.loadData();
    await this.fetchEmergencies();
    await this.fetchHistory();

  },

  bindEvents() {
    document.getElementById('setAvailableBtn').addEventListener('click', () => this.updateStatus('AVAILABLE'));
    document.getElementById('setOfflineBtn').addEventListener('click', () => this.updateStatus('OFFLINE'));
    document.getElementById('refreshLocationBtn').addEventListener('click', () => this.refreshLocation());
    
    const refreshBtn = document.getElementById('refreshHistoryBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => this.fetchHistory());
    
    const retryBtn = document.getElementById('retryHistoryBtn');
    if (retryBtn) retryBtn.addEventListener('click', () => this.fetchHistory());
  },

  async loadData() {
    try {
      const user = await auth.getCurrentUser();
      if (!user) return;

      this.dashAmbulanceName.textContent = user.ambulanceName || 'N/A';
      this.dashVehicleNumber.textContent = user.vehicleNumber || 'N/A';
      this.dashDriverName.textContent = user.driverName || 'N/A';
      this.dashPhone.textContent = user.phone || 'N/A';
      this.dashLat.textContent = user.latitude ? user.latitude.toFixed(6) : 'N/A';
      this.dashLng.textContent = user.longitude ? user.longitude.toFixed(6) : 'N/A';
      
      if (document.getElementById('currentUserVehicle')) {
        document.getElementById('currentUserVehicle').textContent = user.vehicleNumber || '';
      }

      this.renderStatus(user.availabilityStatus || 'OFFLINE');
    } catch (err) {
      console.error('Failed to load ambulance data', err);
    }
  },

  async fetchEmergencies() {
    try {
      const res = await api.fetch('/ambulance/emergencies');
      if (res.ok && res.data.success) {
        this.activeEmergencies = res.data.data || [];
        this.renderEmergencies(this.activeEmergencies);
      }
    } catch (err) {
      console.error('Failed to load emergencies', err);
    }
  },

  renderEmergencies(emergencies) {
    this.activeEmergencies = emergencies || [];
    
    const container = document.getElementById('emergenciesContainer');
    const noEmergenciesState = document.getElementById('noEmergenciesState');
    
    // Create a safe wrapper for cards if it doesn't exist
    let cardsWrapper = document.getElementById('emergencyCardsWrapper');
    if (!cardsWrapper) {
      cardsWrapper = document.createElement('div');
      cardsWrapper.id = 'emergencyCardsWrapper';
      cardsWrapper.className = 'flex flex-col gap-4';
      container.appendChild(cardsWrapper);
    }
    
    if (this.activeEmergencies.length === 0) {
      cardsWrapper.innerHTML = '';
      if (noEmergenciesState) noEmergenciesState.classList.remove('hidden');
      return;
    }

    if (noEmergenciesState) noEmergenciesState.classList.add('hidden');
    cardsWrapper.innerHTML = this.activeEmergencies.map(em => this.createEmergencyHTML(em)).join('');
  },

  async fetchHistory() {
    const loadingState = document.getElementById('loadingHistoryState');
    const errorState = document.getElementById('errorHistoryState');
    const noState = document.getElementById('noHistoryState');
    const container = document.getElementById('historyContainer');
    
    // Create a safe wrapper for cards if it doesn't exist
    let cardsWrapper = document.getElementById('historyCardsWrapper');
    if (!cardsWrapper) {
      cardsWrapper = document.createElement('div');
      cardsWrapper.id = 'historyCardsWrapper';
      cardsWrapper.className = 'flex flex-col gap-4';
      container.appendChild(cardsWrapper);
    }
    
    if (loadingState) loadingState.classList.remove('hidden');
    if (errorState) errorState.classList.add('hidden');
    if (noState) noState.classList.add('hidden');
    cardsWrapper.innerHTML = '';
    
    try {
      const res = await api.fetch('/ambulance/emergencies/history');
      if (loadingState) loadingState.classList.add('hidden');
      
      if (res.ok && res.data.success) {
        this.historyEmergencies = res.data.emergencies || [];
        this.renderHistory();
      } else {
        if (errorState) errorState.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Failed to load emergency history', err);
      if (loadingState) loadingState.classList.add('hidden');
      if (errorState) errorState.classList.remove('hidden');
    }
  },

  renderHistory() {
    const container = document.getElementById('historyContainer');
    const noState = document.getElementById('noHistoryState');
    const cardsWrapper = document.getElementById('historyCardsWrapper');
    
    if (!this.historyEmergencies || this.historyEmergencies.length === 0) {
      cardsWrapper.innerHTML = '';
      if (noState) noState.classList.remove('hidden');
      return;
    }

    if (noState) noState.classList.add('hidden');
    
    // Sort array by completedAt descending
    this.historyEmergencies.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    cardsWrapper.innerHTML = this.historyEmergencies.map(em => this.createHistoryHTML(em)).join('');
  },

  createHistoryHTML(em) {
    const aiConfidence = em.aiAnalysis && em.aiAnalysis.confidence ? Math.round(em.aiAnalysis.confidence * 100) : 0;
    const aiSeverity = em.aiAnalysis && em.aiAnalysis.severity ? em.aiAnalysis.severity : 'Unknown';
    
    // Format dates cleanly
    const formatOpts = { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' };
    const reportedTime = em.createdAt ? new Date(em.createdAt).toLocaleString('en-US', formatOpts) : 'N/A';
    const completedTime = em.completedAt ? new Date(em.completedAt).toLocaleString('en-US', formatOpts) : 'N/A';
    const lat = typeof em.latitude === 'number' ? em.latitude.toFixed(6) : 'N/A';
    const lng = typeof em.longitude === 'number' ? em.longitude.toFixed(6) : 'N/A';

    return `
      <div class="bg-slate-900/60 rounded-xl p-5 border border-slate-700 flex flex-col md:flex-row gap-5 relative group opacity-90 w-full box-border">
        <div class="w-full md:w-48 h-36 rounded-lg overflow-hidden border border-slate-800 bg-black flex-shrink-0 flex items-center justify-center relative">
          <img src="${em.imageUrl}" onerror="this.outerHTML='<div class=\\'text-slate-500 text-sm italic\\'>Image unavailable</div>'" alt="Emergency Evidence" class="w-full h-full object-cover">
          <div class="absolute top-2 right-2 text-[10px] font-black tracking-widest px-2 py-1 rounded border bg-slate-800/80 text-emerald-400 border-emerald-500/30">
            COMPLETED
          </div>
        </div>
        
        <div class="flex flex-col flex-1 min-w-0">
          <div class="flex justify-between items-start">
            <div class="min-w-0">
              <h3 class="text-lg font-black text-slate-300 mb-1 uppercase tracking-wide truncate">EMERGENCY HISTORY</h3>
              <p class="text-sm font-bold text-white truncate">${em.accidentType || 'Unknown'}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <div class="flex flex-col min-w-0">
              <span class="text-[9px] text-slate-500 font-mono tracking-wider truncate">AI SEVERITY:</span>
              <span class="text-xs font-bold text-rose-300 uppercase truncate">${aiSeverity}</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[9px] text-slate-500 font-mono tracking-wider truncate">AI CONFIDENCE:</span>
              <span class="text-xs font-bold text-cyan-300 truncate">${aiConfidence}%</span>
            </div>
            <div class="flex flex-col col-span-2 min-w-0">
              <span class="text-[9px] text-slate-500 font-mono tracking-wider truncate">ACCIDENT LOCATION:</span>
              <span class="text-xs font-mono text-cyan-400 break-words">${lat}, ${lng}</span>
            </div>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-800/50">
            <div class="flex flex-col min-w-0">
              <span class="text-[9px] text-slate-500 font-mono tracking-wider truncate">REPORTED:</span>
              <span class="text-xs font-medium text-slate-300 truncate">${reportedTime}</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[9px] text-slate-500 font-mono tracking-wider text-emerald-500 truncate">COMPLETED:</span>
              <span class="text-xs font-medium text-emerald-400 truncate">${completedTime}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  createEmergencyHTML(em) {
    let borderClass = 'border-slate-700/60';
    if (em.ambulanceAlertStatus === 'SENT') {
      borderClass = 'border-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] ring-1 ring-rose-500';
    } else if (em.ambulanceAlertStatus === 'ACCEPTED') {
      borderClass = 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500';
    }

    const aiConfidence = em.aiAnalysis && em.aiAnalysis.confidence ? Math.round(em.aiAnalysis.confidence * 100) : 0;
    const aiSeverity = em.aiAnalysis && em.aiAnalysis.severity ? em.aiAnalysis.severity : 'Unknown';

    return `
      <div id="emergency-${em.accidentId}" class="bg-slate-900/80 rounded-xl p-5 border ${borderClass} flex flex-col md:flex-row gap-5 relative overflow-hidden group w-full box-border">
        
        <div class="w-full md:w-64 h-48 rounded-lg overflow-hidden border border-slate-800 bg-black flex-shrink-0 flex items-center justify-center relative">
          <img src="${em.imageUrl}" onerror="this.outerHTML='<div class=\\'text-slate-500 text-sm italic\\'>Photo unavailable</div>'" alt="Emergency Evidence" class="w-full h-full object-cover">
          <div class="absolute top-2 right-2 text-[10px] font-black tracking-widest px-2 py-1 rounded border bg-rose-500/20 text-rose-400 border-rose-500/30">
            ${em.ambulanceAlertStatus}
          </div>
        </div>
        
        <div class="flex flex-col flex-1 min-w-0">
          <div class="flex justify-between items-start">
            <div class="min-w-0">
              <h3 class="text-xl font-black text-rose-400 mb-1 uppercase tracking-wide truncate">ACCIDENT DETECTED</h3>
              <p class="text-sm font-bold text-white truncate">${em.accidentType}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div class="flex flex-col min-w-0">
              <span class="text-[10px] text-slate-500 font-mono tracking-wider truncate">AI SEVERITY:</span>
              <span class="text-sm font-bold text-rose-300 uppercase truncate">${aiSeverity}</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[10px] text-slate-500 font-mono tracking-wider truncate">AI CONFIDENCE:</span>
              <span class="text-sm font-bold text-cyan-300 truncate">${aiConfidence}%</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[10px] text-slate-500 font-mono tracking-wider truncate">DISTANCE:</span>
              <span class="text-sm font-semibold text-amber-300 truncate">${em.distanceKm ? em.distanceKm.toFixed(2) + ' km' : 'N/A'}</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[10px] text-slate-500 font-mono tracking-wider truncate">📍 EXACT LOCATION:</span>
              <span class="text-xs font-mono text-cyan-400 break-words">${em.latitude.toFixed(6)}, ${em.longitude.toFixed(6)}</span>
            </div>
          </div>
          
          <div class="mt-3 text-sm text-slate-300 bg-black/40 p-3 rounded border border-slate-800 break-words whitespace-pre-wrap">
            <span class="text-[10px] text-slate-500 font-mono tracking-wider block mb-1">DESCRIPTION:</span>
            ${em.description}
          </div>

          ${em.ambulanceAlertStatus === 'SENT' ? `
            <div class="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-slate-800/50 w-full">
              <button onclick="AmbulanceDashboardService.acceptEmergency('${em.accidentId}')" class="flex-1 min-w-0 btn-cyber-primary !bg-rose-600 hover:!bg-rose-500 !border-rose-400 py-3 rounded-lg font-black text-sm tracking-widest shadow-lg shadow-rose-900/50 transition-colors break-words whitespace-normal text-center">
                ACCEPT EMERGENCY
              </button>
              <button onclick="AmbulanceDashboardService.declineEmergency('${em.accidentId}')" class="flex-1 min-w-0 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white py-3 rounded-lg font-bold text-sm transition-colors break-words whitespace-normal text-center">
                DISMISS
              </button>
            </div>
          ` : ''}

          ${em.ambulanceAlertStatus === 'ACCEPTED' ? `
            <div class="mt-2 mb-2 p-2 bg-rose-900/40 rounded border border-rose-500/50 flex items-center gap-2 w-full box-border">
              <span class="animate-pulse flex-shrink-0">🚨</span>
              <span class="text-xs font-bold text-rose-300 min-w-0 truncate">STATUS: RESPONDING</span>
            </div>
            
            <div class="mt-4 pt-4 border-t border-slate-800/50 bg-slate-900/40 p-4 rounded-lg border border-slate-800 w-full box-border">
              <div class="text-[10px] text-slate-500 font-mono tracking-widest mb-4 text-center w-full uppercase">EMERGENCY ACTIONS</div>
              
              <div class="flex flex-col md:flex-row gap-3 w-full">
                <button onclick="AmbulanceDashboardService.navigateGoogleMaps(${em.latitude}, ${em.longitude})" class="flex-1 min-w-0 bg-cyan-600 hover:bg-cyan-500 border border-cyan-400 text-white py-3.5 px-4 rounded-lg font-black text-sm tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center text-center break-words whitespace-normal">
                  NAVIGATE TO ACCIDENT
                </button>
                
                <button onclick="AmbulanceDashboardService.completeEmergency('${em.accidentId}')" class="flex-1 min-w-0 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 py-3.5 px-4 rounded-lg font-bold text-sm tracking-wide transition-all flex items-center justify-center text-center shadow-lg break-words whitespace-normal">
                  COMPLETE EMERGENCY
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  async acceptEmergency(id) {
    try {
      const res = await api.fetch(`/ambulance/emergencies/${id}/accept`, { method: 'PATCH' });
      if (res.ok && res.data.success) {
        this.showMessage('Emergency accepted! You are now BUSY.', 'success');
        this.renderStatus('BUSY');
        this.fetchEmergencies();
      } else {
        this.showMessage(res.data.message || 'Failed to accept', 'error');
      }
    } catch (err) {
      this.showMessage('Network error', 'error');
    }
  },

  async declineEmergency(id) {
    try {
      const res = await api.fetch(`/ambulance/emergencies/${id}/decline`, { method: 'PATCH' });
      if (res.ok && res.data.success) {
        this.showMessage('Emergency dismissed.', 'info');
        this.fetchEmergencies();
      } else {
        this.showMessage(res.data.message || 'Failed to dismiss', 'error');
      }
    } catch (err) {
      this.showMessage('Network error', 'error');
    }
  },

  async completeEmergency(id) {
    try {
      const res = await api.fetch(`/ambulance/emergencies/${id}/complete`, { method: 'PATCH' });
      if (res.ok && res.data.success) {
        this.showMessage('Emergency completed! You are now AVAILABLE.', 'success');
        this.renderStatus('AVAILABLE');
        this.fetchEmergencies();
        this.fetchHistory();
      } else {
        this.showMessage(res.data.message || 'Failed to complete', 'error');
      }
    } catch (err) {
      this.showMessage('Network error', 'error');
    }
  },

  navigateGoogleMaps(lat, lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      this.showMessage('Accident location is unavailable.', 'error');
      return;
    }
    
    // Construct Google Maps directions URL
    // This allows Google Maps to use the device's current location as origin and sets the accident as the destination
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}&travelmode=driving`;
    
    // Open in a new tab/window, which redirects to Maps app on mobile
    window.open(url, '_blank');
  },

  initSocket() {
    const token = localStorage.getItem('saferoute_token');
    if (!token || typeof io === 'undefined') return;

    this.socket = io(window.location.origin, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      this.showMessage('Real-time connection active', 'success');
      this.fetchEmergencies();
    });

    this.socket.on('disconnect', () => {
      this.showMessage('Real-time connection lost', 'error');
    });

    this.socket.on('accident:emergency', (em) => {
      console.log('[EMERGENCY] accident:emergency RECEIVED', em);
      
      if (!this.activeEmergencies) {
        this.activeEmergencies = [];
      }

      // Avoid duplicate rendering
      const exists = this.activeEmergencies.some(existing => existing.accidentId === em.accidentId);
      if (exists) return;

      em.ambulanceAlertStatus = 'SENT'; // Override local prop just for display
      
      // Add to state and render
      this.activeEmergencies.unshift(em);
      this.renderEmergencies(this.activeEmergencies);

      // Flash body briefly
      document.body.classList.add('ring-4', 'ring-inset', 'ring-rose-500');
      setTimeout(() => document.body.classList.remove('ring-4', 'ring-inset', 'ring-rose-500'), 1500);

      // Play alert sound if available (placeholder behavior)
      this.showMessage('🚨 NEW EMERGENCY RECEIVED!', 'error');
    });

    // Listen for live mode status updates from server
    this.socket.on('ambulance:live_mode_status', (data) => {
      console.log('[SOCKET] ambulance:live_mode_status received:', data);
      this.renderLiveMode(Boolean(data.isLive), data.alertedUsersCount || 0);
    });

    // Listen for nearby alerted motorists count (within 350m)
    this.socket.on('ambulance:nearby_users_count', (data) => {
      console.log('[SOCKET] ambulance:nearby_users_count received:', data);
      this.updateAlertedUsersCount(data.count || 0);
    });
  },


  renderStatus(status) {
    this.statusBadge.textContent = status;
    const setAvailableBtn = document.getElementById('setAvailableBtn');
    const setOfflineBtn = document.getElementById('setOfflineBtn');
    
    if (status === 'AVAILABLE') {
      this.statusBadge.className = 'text-sm font-bold px-3 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
      setAvailableBtn.disabled = false;
      setOfflineBtn.disabled = false;
      setAvailableBtn.classList.remove('opacity-30', 'cursor-not-allowed');
      setOfflineBtn.classList.remove('opacity-30', 'cursor-not-allowed');
    } else if (status === 'BUSY') {
      this.statusBadge.className = 'text-sm font-bold px-3 py-1 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.4)] animate-pulse';
      setAvailableBtn.disabled = true;
      setOfflineBtn.disabled = true;
      setAvailableBtn.classList.add('opacity-30', 'cursor-not-allowed');
      setOfflineBtn.classList.add('opacity-30', 'cursor-not-allowed');
    } else {
      this.statusBadge.className = 'text-sm font-bold px-3 py-1 rounded-full border bg-slate-500/10 text-slate-400 border-slate-500/30';
      setAvailableBtn.disabled = false;
      setOfflineBtn.disabled = false;
      setAvailableBtn.classList.remove('opacity-30', 'cursor-not-allowed');
      setOfflineBtn.classList.remove('opacity-30', 'cursor-not-allowed');
    }
  },

  async updateStatus(newStatus) {
    this.showMessage('Updating status...', 'info');
    try {
      const res = await api.fetch('/ambulance/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok && res.data.success) {
        this.renderStatus(res.data.data.availabilityStatus);
        this.showMessage(`Status updated to ${newStatus}`, 'success');
      } else {
        this.showMessage(res.data.message || 'Failed to update status', 'error');
      }
    } catch (err) {
      this.showMessage('Network error while updating status', 'error');
    }
  },

  refreshLocation() {
    if (!navigator.geolocation) {
      this.showMessage('Geolocation is not supported by your browser', 'error');
      return;
    }

    const btn = document.getElementById('refreshLocationBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Locating...';
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const res = await api.fetch('/ambulance/location', {
            method: 'PATCH',
            body: JSON.stringify({ latitude, longitude })
          });
          
          if (res.ok && res.data.success) {
            this.dashLat.textContent = latitude.toFixed(6);
            this.dashLng.textContent = longitude.toFixed(6);
            
            this.showMessage('Location updated successfully', 'success');
          } else {
            this.showMessage(res.data.message || 'Failed to update location', 'error');
          }
        } catch (err) {
          this.showMessage('Network error updating location', 'error');
        }
        
        btn.innerHTML = originalText;
        btn.disabled = false;
      },
      (error) => {
        let msg = 'Failed to get GPS location.';
        if (error.code === error.PERMISSION_DENIED) msg = 'Location permission denied.';
        this.showMessage(msg, 'error');
        
        btn.innerHTML = originalText;
        btn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  // ============================================
  // LIVE EMERGENCY MODE & 350M CLEAR-LANE BROADCAST
  // ============================================
  isLiveMode: false,
  gpsWatcherId: null,
  gpsIntervalId: null,
  lastBroadcastCoords: null,

  initLiveMode() {
    this.liveModeCard = document.getElementById('liveModeCard');
    this.liveModeBadge = document.getElementById('liveModeBadge');
    this.liveModeBeacon = document.getElementById('liveModeBeacon');
    this.alertedDriversCount = document.getElementById('alertedDriversCount');
    this.gpsStreamStatus = document.getElementById('gpsStreamStatus');
    this.gpsStreamCoords = document.getElementById('gpsStreamCoords');
    this.toggleLiveModeBtn = document.getElementById('toggleLiveModeBtn');

    if (this.toggleLiveModeBtn) {
      this.toggleLiveModeBtn.addEventListener('click', () => this.toggleLiveMode());
    }

    this.setupSimulationControls();
    this.checkInitialLiveStatus();
  },

  async checkInitialLiveStatus() {
    try {
      const res = await api.fetch('/ambulance/live-status');
      if (res.ok && res.data.success && res.data.data) {
        if (res.data.data.isLiveMode) {
          this.renderLiveMode(true, 0);
          this.startGpsStream();
        }
      }
    } catch (e) {
      console.warn('Could not fetch initial live status:', e);
    }
  },

  setupSimulationControls() {
    const simLatInput = document.getElementById('simLatInput');
    const simLngInput = document.getElementById('simLngInput');
    const simBroadcastBtn = document.getElementById('simBroadcastBtn');
    const simSyncNearUserBtn = document.getElementById('simSyncNearUserBtn');

    if (simBroadcastBtn) {
      simBroadcastBtn.addEventListener('click', () => {
        const lat = parseFloat(simLatInput.value);
        const lng = parseFloat(simLngInput.value);
        if (isNaN(lat) || isNaN(lng)) {
          this.showMessage('Please enter valid numeric latitude and longitude for simulation', 'error');
          return;
        }

        if (!this.isLiveMode) {
          this.toggleLiveMode(true);
        }

        this.broadcastLocation(lat, lng, 45, 0);
        this.showMessage(`Simulated coordinates broadcasted: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, 'success');
      });
    }

    if (simSyncNearUserBtn) {
      simSyncNearUserBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
          this.showMessage('Geolocation unavailable for auto-sync', 'error');
          return;
        }

        simSyncNearUserBtn.textContent = 'Acquiring GPS...';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            // Offset slightly by ~0.001 deg (~110m away, inside the 350m lane)
            const targetLat = pos.coords.latitude + 0.001;
            const targetLng = pos.coords.longitude + 0.0005;

            simLatInput.value = targetLat.toFixed(6);
            simLngInput.value = targetLng.toFixed(6);
            simSyncNearUserBtn.textContent = 'Set Within 200m of Current GPS';

            if (!this.isLiveMode) {
              this.toggleLiveMode(true);
            }

            this.broadcastLocation(targetLat, targetLng, 50, 45);
            this.showMessage('Broadcasted simulated position ~110m from your GPS (Within 350m Lane Clear Radius)', 'success');
          },
          (err) => {
            simSyncNearUserBtn.textContent = 'Set Within 200m of Current GPS';
            this.showMessage('Failed to acquire GPS for sync simulation', 'error');
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
    }
  },

  async toggleLiveMode(forceState = null) {
    const nextState = forceState !== null ? forceState : !this.isLiveMode;
    this.isLiveMode = nextState;

    this.renderLiveMode(this.isLiveMode);

    if (this.isLiveMode) {
      this.showMessage('🚨 EMERGENCY LIVE MODE ACTIVATED! Broadcasting 350m lane-clear warnings.', 'error');
      this.startGpsStream();
    } else {
      this.showMessage('Live mode deactivated. Clear-lane broadcast ended.', 'info');
      this.stopGpsStream();
    }

    // Determine current coords to send with toggle
    let lat = null;
    let lng = null;
    if (this.lastBroadcastCoords) {
      lat = this.lastBroadcastCoords.lat;
      lng = this.lastBroadcastCoords.lng;
    } else {
      const latText = this.dashLat ? parseFloat(this.dashLat.textContent) : NaN;
      const lngText = this.dashLng ? parseFloat(this.dashLng.textContent) : NaN;
      if (!isNaN(latText) && !isNaN(lngText)) {
        lat = latText;
        lng = lngText;
      }
    }

    // Emit via Socket.io
    if (this.socket && this.socket.connected) {
      this.socket.emit('ambulance:toggle_live_mode', {
        isLive: this.isLiveMode,
        latitude: lat,
        longitude: lng
      }, (res) => {
        if (res && res.alertedUsersCount !== undefined) {
          this.updateAlertedUsersCount(res.alertedUsersCount);
        }
      });
    }

    // Also call REST API in background
    try {
      const res = await api.fetch('/ambulance/live-mode', {
        method: 'PATCH',
        body: JSON.stringify({
          isLive: this.isLiveMode,
          latitude: lat,
          longitude: lng
        })
      });
      if (res.ok && res.data && res.data.alertedUsersCount !== undefined) {
        this.updateAlertedUsersCount(res.data.alertedUsersCount);
      }
    } catch (e) {
      console.warn('REST live-mode sync notice:', e);
    }
  },

  renderLiveMode(isLive, alertedUsersCount = null) {
    this.isLiveMode = isLive;

    if (!this.toggleLiveModeBtn || !this.liveModeBadge || !this.liveModeBeacon || !this.liveModeCard) {
      return;
    }

    if (isLive) {
      // Active Live Mode styling
      this.liveModeCard.className = 'glass-panel p-6 flex flex-col gap-4 border border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/50 relative overflow-hidden transition-all duration-300';
      this.liveModeBeacon.className = 'w-3.5 h-3.5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,1)] animate-ping';
      this.liveModeBadge.className = 'text-xs font-mono font-bold px-3 py-1.5 rounded-full border bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)]';
      this.liveModeBadge.textContent = '🔴 LIVE ON-ROAD: BROADCASTING (350M)';

      this.toggleLiveModeBtn.className = 'flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-rose-400 py-3.5 rounded-xl font-black text-sm tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg';
      this.toggleLiveModeBtn.innerHTML = '<span>⏹</span> DEACTIVATE LIVE MODE';

      if (this.gpsStreamStatus) {
        this.gpsStreamStatus.textContent = 'ACTIVE (BROADCASTING)';
        this.gpsStreamStatus.className = 'text-base font-bold text-rose-400 font-mono mt-0.5 animate-pulse';
      }
    } else {
      // Inactive Standby styling
      this.liveModeCard.className = 'glass-panel p-6 flex flex-col gap-4 border border-rose-500/30 relative overflow-hidden transition-all duration-300';
      this.liveModeBeacon.className = 'w-3.5 h-3.5 rounded-full bg-slate-600 transition-colors';
      this.liveModeBadge.className = 'text-xs font-mono font-bold px-3 py-1.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700 transition-all';
      this.liveModeBadge.textContent = 'LIVE MODE: OFF';

      this.toggleLiveModeBtn.className = 'flex-1 btn-cyber-primary !bg-rose-600 hover:!bg-rose-500 !border-rose-400 py-3.5 rounded-xl font-black text-sm tracking-widest shadow-lg shadow-rose-900/50 transition-all flex items-center justify-center gap-2';
      this.toggleLiveModeBtn.innerHTML = '<span>🚨</span> ACTIVATE LIVE MODE (BROADCAST LANE CLEAR)';

      if (this.gpsStreamStatus) {
        this.gpsStreamStatus.textContent = 'STANDBY';
        this.gpsStreamStatus.className = 'text-base font-bold text-slate-400 font-mono mt-0.5';
      }
      if (this.gpsStreamCoords) {
        this.gpsStreamCoords.textContent = 'Waiting for live mode...';
      }
    }

    if (alertedUsersCount !== null) {
      this.updateAlertedUsersCount(alertedUsersCount);
    }
  },

  updateAlertedUsersCount(count) {
    this.alertedUsersCount = count || 0;
    if (this.alertedDriversCount) {
      this.alertedDriversCount.textContent = `${this.alertedUsersCount} DRIVER${this.alertedUsersCount === 1 ? '' : 'S'}`;
      if (this.alertedUsersCount > 0) {
        this.alertedDriversCount.className = 'text-base font-bold text-emerald-400 font-mono mt-0.5 animate-bounce';
      } else {
        this.alertedDriversCount.className = 'text-base font-bold text-amber-400 font-mono mt-0.5';
      }
    }
  },

  startGpsStream() {
    this.stopGpsStream();

    if (!navigator.geolocation) {
      this.showMessage('Geolocation is not supported by your browser', 'error');
      return;
    }

    // High accuracy continuous watcher
    this.gpsWatcherId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading } = position.coords;
        this.handleNewLivePosition(latitude, longitude, speed, heading);
      },
      (error) => {
        console.warn('GPS Live watch warning:', error.message);
        if (this.gpsStreamStatus) {
          this.gpsStreamStatus.textContent = 'GPS SEARCHING...';
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );

    // Periodic heartbeat to guarantee regular updates
    this.gpsIntervalId = setInterval(() => {
      if (this.isLiveMode && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.handleNewLivePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.speed, pos.coords.heading);
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
        );
      }
    }, 4000);
  },

  handleNewLivePosition(latitude, longitude, speed = null, heading = null) {
    if (!this.isLiveMode) return;

    this.lastBroadcastCoords = { lat: latitude, lng: longitude };

    if (this.dashLat) this.dashLat.textContent = latitude.toFixed(6);
    if (this.dashLng) this.dashLng.textContent = longitude.toFixed(6);
    if (this.gpsStreamCoords) this.gpsStreamCoords.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

    const speedKmh = speed != null && speed >= 0 ? Math.round(speed * 3.6) : 0;
    const headingVal = heading != null ? Math.round(heading) : 0;

    this.broadcastLocation(latitude, longitude, speedKmh, headingVal);
  },

  stopGpsStream() {
    if (this.gpsWatcherId !== null) {
      navigator.geolocation.clearWatch(this.gpsWatcherId);
      this.gpsWatcherId = null;
    }
    if (this.gpsIntervalId !== null) {
      clearInterval(this.gpsIntervalId);
      this.gpsIntervalId = null;
    }
  },

  broadcastLocation(latitude, longitude, speed = 0, heading = 0) {
    this.lastBroadcastCoords = { lat: latitude, lng: longitude };

    // Emit via Socket.io
    if (this.socket && this.socket.connected) {
      this.socket.emit('ambulance:live_location', {
        latitude,
        longitude,
        speed,
        heading
      }, (res) => {
        if (res && res.alertedUsersCount !== undefined) {
          this.updateAlertedUsersCount(res.alertedUsersCount);
        }
      });
    }

    // Call REST endpoint in background to sync state
    api.fetch('/ambulance/live-location', {
      method: 'PATCH',
      body: JSON.stringify({ latitude, longitude, speed, heading })
    }).then(res => {
      if (res.ok && res.data && res.data.alertedUsersCount !== undefined) {
        this.updateAlertedUsersCount(res.data.alertedUsersCount);
      }
    }).catch(err => {
      // silent network log
    });
  },


    if (!this.statusMessage) return;
    
    this.statusMessage.textContent = text;
    this.statusMessage.classList.remove('hidden');
    
    if (type === 'success') {
      this.statusMessage.className = 'text-center text-sm font-medium p-2 rounded mt-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 block';
    } else if (type === 'error') {
      this.statusMessage.className = 'text-center text-sm font-medium p-2 rounded mt-2 bg-rose-500/10 text-rose-400 border border-rose-500/30 block';
    } else {
      this.statusMessage.className = 'text-center text-sm font-medium p-2 rounded mt-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 block';
    }
    
    setTimeout(() => {
      this.statusMessage.classList.add('hidden');
    }, 4000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Protect route
  if (!auth.protectRoute(['AMBULANCE'])) {
    return;
  }

  // 2. Initialize UI with basic user data from localStorage
  const user = auth.getUser();
  if (user) {
    document.getElementById('currentUserName').textContent = user.name;
    document.getElementById('userInitial').textContent = user.name.charAt(0).toUpperCase();
  }

  // 3. Setup Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.logout();
  });

  // 4. Initialize Dashboard
  AmbulanceDashboardService.init();
  AmbulanceDashboardService.initSocket();
});
