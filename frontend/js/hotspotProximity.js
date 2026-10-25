const SafeRouteHotspotProximity = {
  watcherId: null,
  activeHotspots: [],
  currentProximity: null,
  TEST_BUFFER_METERS: 200,

  init() {
    console.log('[PROXIMITY] Service initialized');
  },

  start() {
    if (!navigator.geolocation) {
      console.warn('[PROXIMITY] Geolocation is not supported by this browser.');
      return;
    }

    if (this.watcherId !== null) {
      this.stop();
    }

    console.log('[PROXIMITY] Starting GPS watcher');
    this.watcherId = navigator.geolocation.watchPosition(
      this.handlePositionUpdate.bind(this),
      this.handlePositionError.bind(this),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  },

  stop() {
    if (this.watcherId !== null) {
      navigator.geolocation.clearWatch(this.watcherId);
      this.watcherId = null;
      console.log('[PROXIMITY] Stopped GPS watcher');
      
      this.currentProximity = {
        hotspotId: null,
        riskLevel: null,
        hotspotRadiusMeters: null,
        distanceMeters: null,
        state: 'OUTSIDE_HOTSPOT',
        userLatitude: null,
        userLongitude: null,
        speedKmh: null,
        updatedAt: new Date()
      };
      this.notifyListeners();
    }
  },

  updateHotspots(hotspots) {
    this.activeHotspots = hotspots || [];
    console.log(`[PROXIMITY] Updated active hotspots (${this.activeHotspots.length})`);
    
    // If we already have a calculated position, recalculate immediately
    if (this.currentProximity && this.currentProximity.userLatitude) {
      this.calculateProximity(this.currentProximity.userLatitude, this.currentProximity.userLongitude, this.currentProximity.speedKmh);
    }
  },

  handlePositionUpdate(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    
    // Optional speed in m/s -> km/h
    let speedKmh = null;
    if (position.coords.speed != null && position.coords.speed >= 0 && !isNaN(position.coords.speed)) {
      speedKmh = position.coords.speed * 3.6;
    }

    // Optional: We can update the map location here if we want to seamlessly tie it in,
    // but the instructions say: "Do not duplicate existing map/location marker logic unnecessarily...
    // The existing current-location functionality must continue working."
    // We'll leave MapService updates to userDashboard.js manual click, or update MapService seamlessly.
    // Actually, updating MapService seamlessly here is beneficial but not required. We'll just calculate proximity.

    this.calculateProximity(lat, lng, speedKmh);
  },

  handlePositionError(error) {
    console.warn('[PROXIMITY] GPS Error:', error.message);
    // Silent fail per requirements (dashboard remains functional, no JS crash, no UI spam)
  },

  calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const toRadians = (degrees) => degrees * Math.PI / 180;
    
    const phi1 = toRadians(lat1);
    const phi2 = toRadians(lat2);
    const deltaPhi = toRadians(lat2 - lat1);
    const deltaLambda = toRadians(lon2 - lon1);

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  calculateProximity(userLat, userLng, speedKmh = null) {
    if (!this.activeHotspots || this.activeHotspots.length === 0) {
      this.currentProximity = {
        hotspotId: null,
        riskLevel: null,
        hotspotRadiusMeters: null,
        distanceMeters: null,
        state: 'OUTSIDE_HOTSPOT',
        userLatitude: userLat,
        userLongitude: userLng,
        speedKmh: speedKmh,
        updatedAt: new Date()
      };
      this.notifyListeners();
      return;
    }

    let nearestHotspot = null;
    let minDistance = Infinity;

    for (const hotspot of this.activeHotspots) {
      const dist = this.calculateDistanceMeters(
        userLat, userLng,
        hotspot.centerLatitude, hotspot.centerLongitude
      );

      if (dist < minDistance) {
        minDistance = dist;
        nearestHotspot = hotspot;
      }
    }

    let state = 'OUTSIDE_HOTSPOT';
    if (nearestHotspot) {
      if (minDistance <= nearestHotspot.radius) {
        state = 'INSIDE_HOTSPOT';
      } else if (minDistance <= nearestHotspot.radius + this.TEST_BUFFER_METERS) {
        state = 'APPROACHING_HOTSPOT';
      }
    }

    this.currentProximity = {
      hotspotId: nearestHotspot ? nearestHotspot._id : null,
      riskLevel: nearestHotspot ? nearestHotspot.riskLevel : null,
      distanceMeters: minDistance === Infinity ? null : Number(minDistance.toFixed(2)),
      hotspotRadiusMeters: nearestHotspot ? nearestHotspot.radius : null,
      accidentCount: nearestHotspot ? nearestHotspot.accidentCount : null,
      state: state,
      userLatitude: userLat,
      userLongitude: userLng,
      speedKmh: speedKmh ? Number(speedKmh.toFixed(2)) : null,
      updatedAt: new Date()
    };

    console.log(`[PROXIMITY UPDATE] Nearest: ${minDistance.toFixed(2)}m | State: ${state} | Speed: ${speedKmh ? speedKmh.toFixed(2) : 'null'} km/h`);
    this.notifyListeners();
  },

  listeners: [],

  subscribe(callback) {
    this.listeners.push(callback);
    // Initial call
    if (this.currentProximity) {
      callback(this.currentProximity);
    }
  },

  notifyListeners() {
    for (const callback of this.listeners) {
      try {
        callback(this.currentProximity);
      } catch (err) {
        console.error('[PROXIMITY] Listener error:', err);
      }
    }
  },

  getCurrentProximity() {
    return this.currentProximity;
  },

  // ------------------------------------------------------------------
  // DEVELOPMENT TESTING
  // ------------------------------------------------------------------
  runTests() {
    console.log('\n--- STARTING PROXIMITY TESTS ---');
    const originalHotspots = this.activeHotspots;
    
    // Mock Hotspots
    const mockHotspot1 = { _id: 'hs1', centerLatitude: 10.0000, centerLongitude: 76.0000, radius: 50, riskLevel: 'HIGH' };
    const mockHotspot2 = { _id: 'hs2', centerLatitude: 10.0100, centerLongitude: 76.0100, radius: 50, riskLevel: 'LOW' };
    
    // TEST 1: No hotspots
    this.updateHotspots([]);
    this.calculateProximity(10.0, 76.0);
    console.log('TEST 1 (No hotspots):', this.getCurrentProximity().state === 'OUTSIDE_HOTSPOT' && this.getCurrentProximity().hotspotId === null ? 'PASS' : 'FAIL');

    // TEST 2: Far from all
    this.updateHotspots([mockHotspot1, mockHotspot2]);
    this.calculateProximity(11.0, 77.0);
    console.log('TEST 2 (Far away):', this.getCurrentProximity().state === 'OUTSIDE_HOTSPOT' ? 'PASS' : 'FAIL');

    // TEST 3: Approaching (within 200m buffer, outside 50m radius)
    // 0.001 degrees is approx 111 meters
    this.calculateProximity(10.0010, 76.0000); 
    console.log('TEST 3 (Approaching):', this.getCurrentProximity().state === 'APPROACHING_HOTSPOT' ? 'PASS' : 'FAIL');

    // TEST 4: Inside
    this.calculateProximity(10.0001, 76.0001); // Approx 15 meters
    console.log('TEST 4 (Inside):', this.getCurrentProximity().state === 'INSIDE_HOTSPOT' ? 'PASS' : 'FAIL');

    // TEST 5: Nearest selection
    // Closer to hs2
    this.calculateProximity(10.0101, 76.0101);
    console.log('TEST 5 (Multiple hotspots):', this.getCurrentProximity().hotspotId === 'hs2' ? 'PASS' : 'FAIL');

    // TEST 8 & 9: Speed
    this.calculateProximity(10.0000, 76.0000, null);
    console.log('TEST 9 (No speed):', this.getCurrentProximity().speedKmh === null ? 'PASS' : 'FAIL');
    
    this.calculateProximity(10.0000, 76.0000, 10); // 10 km/h mock input
    console.log('TEST 8 (With speed):', this.getCurrentProximity().speedKmh === 10 ? 'PASS' : 'FAIL');

    // Restore
    this.updateHotspots(originalHotspots);
    console.log('--- END PROXIMITY TESTS ---\n');
  }
};

window.SafeRouteHotspotProximity = SafeRouteHotspotProximity;

document.addEventListener('DOMContentLoaded', () => {
  SafeRouteHotspotProximity.init();
});
