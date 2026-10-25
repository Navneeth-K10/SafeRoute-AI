const HotspotService = {
  hotspotMarkers: [],
  hotspotCircles: [],
  infoWindow: null,
  
  // Colors matching the Tailwind legend
  colors: {
    LOW: '#10b981',       // Emerald 500
    MODERATE: '#fbbf24',  // Amber 400
    HIGH: '#f97316',      // Orange 500
    CRITICAL: '#e11d48'   // Rose 600
  },

  init() {
    this.bindEvents();
    // Wait for the map to be fully initialized before loading hotspots
    this.waitForMapAndLoad();
  },

  bindEvents() {
    const refreshBtn = document.getElementById('refreshHotspotsBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        const icon = refreshBtn.querySelector('svg');
        if (icon) icon.classList.add('animate-spin');
        
        this.loadHotspots().finally(() => {
          if (icon) icon.classList.remove('animate-spin');
        });
      });
    }
  },

  waitForMapAndLoad() {
    const checkInterval = setInterval(() => {
      if (MapService && MapService.isLoaded && MapService.map) {
        clearInterval(checkInterval);
        
        // Initialize shared InfoWindow
        this.infoWindow = new google.maps.InfoWindow();
        
        this.loadHotspots();
      }
    }, 500);
  },

  clearHotspots() {
    // Clear markers
    this.hotspotMarkers.forEach(marker => {
      marker.map = null;
    });
    this.hotspotMarkers = [];

    // Clear circles
    this.hotspotCircles.forEach(circle => {
      circle.setMap(null);
    });
    this.hotspotCircles = [];

    if (this.infoWindow) {
      this.infoWindow.close();
    }
  },

  async loadHotspots() {
    try {
      const response = await api.fetch('/hotspots');
      if (response.ok && response.data && response.data.success) {
        this.clearHotspots();
        this.renderHotspots(response.data.data);
      }
    } catch (error) {
      console.error('Error loading hotspots:', error);
      // Small non-blocking error handled silently as per requirements
    }
  },

  renderHotspots(hotspots) {
    // Notify proximity service of new hotspots
    if (window.SafeRouteHotspotProximity) {
      window.SafeRouteHotspotProximity.updateHotspots(hotspots);
    }

    if (!hotspots || hotspots.length === 0) {
      // Empty state
      this.showToast('No accident hotspots detected in the current system.');
      return;
    }

    hotspots.forEach(hotspot => {
      this.createHotspotVisuals(hotspot);
    });
  },

  createHotspotVisuals(hotspot) {
    const map = MapService.map;
    const position = { lat: hotspot.centerLatitude, lng: hotspot.centerLongitude };
    const color = this.colors[hotspot.riskLevel] || this.colors.LOW;

    const opacityMap = {
      LOW: { fill: 0.12, stroke: 0.45 },
      MODERATE: { fill: 0.16, stroke: 0.55 },
      HIGH: { fill: 0.20, stroke: 0.65 },
      CRITICAL: { fill: 0.25, stroke: 0.75 }
    };
    const opacities = opacityMap[hotspot.riskLevel] || opacityMap.LOW;

    // 1. Create the Radius Circle
    const circle = new google.maps.Circle({
      strokeColor: color,
      strokeOpacity: opacities.stroke,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: opacities.fill,
      map: map,
      center: position,
      radius: hotspot.radius, // exact radius from backend
      clickable: true, // Allow clicking the circle to open info window
      zIndex: 1 // Sit below standard markers
    });
    this.hotspotCircles.push(circle);

    // 2. Create the AdvancedMarkerElement for the center
    const pinElement = new google.maps.marker.PinElement({
      background: color,
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      scale: 1.0,
      glyph: '!'
    });

    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: position,
      map: map,
      title: 'Accident Hotspot',
      content: pinElement.element,
      zIndex: 5
    });
    this.hotspotMarkers.push(marker);

    // 3. InfoWindow content string
    const dateStr = new Date(hotspot.lastUpdatedAt).toLocaleString();
    const contentString = `
      <div style="font-family: sans-serif; color: #1e293b; padding: 4px; min-width: 150px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Accident Hotspot</h3>
        <div style="font-size: 12px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between;">
            <strong>Risk Level:</strong> <span style="color: ${color}; font-weight: bold;">${hotspot.riskLevel}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <strong>Verified Accidents:</strong> <span>${hotspot.accidentCount}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <strong>Risk Score:</strong> <span>${hotspot.riskScore}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <strong>Radius:</strong> <span>${hotspot.radius} m</span>
          </div>
          <div style="margin-top: 4px; font-size: 10px; color: #64748b;">
            Updated: ${dateStr}
          </div>
        </div>
      </div>
    `;

    // Click event on Marker
    marker.addListener('click', () => {
      this.infoWindow.setContent(contentString);
      this.infoWindow.open({
        anchor: marker,
        map,
      });
    });

    // Click event on Circle
    circle.addListener('click', (e) => {
      // Create a temporary anchor for the InfoWindow where the user clicked inside the circle
      this.infoWindow.setContent(contentString);
      this.infoWindow.setPosition(e.latLng);
      this.infoWindow.open({ map });
      
      // Pass the click event down to the underlying map
      // This ensures "Select Accident Location" still works even when clicking inside a hotspot!
      google.maps.event.trigger(map, 'click', e);
    });
  },

  showToast(message) {
    // Simple non-intrusive toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-200 px-4 py-2 rounded-lg shadow-xl text-xs z-50 transition-opacity border border-slate-700';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }
};

// Auto-initialize when file loads
document.addEventListener('DOMContentLoaded', () => {
  HotspotService.init();
});
