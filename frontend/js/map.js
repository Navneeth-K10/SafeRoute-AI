const MapService = {
  map: null,
  userMarker: null,
  accidentMarker: null,
  isLoaded: false,

  async initMap(containerId) {
    try {
      // Get API Key from frontend config
      const apiKey = SafeRouteConfig.GOOGLE_MAPS_API_KEY;
      
      if (!apiKey || apiKey === 'PASTE_YOUR_NEW_API_KEY_HERE' || apiKey === 'YOUR_GOOGLE_MAPS_KEY') {
        throw new Error('Google Maps API key is not configured in config.js');
      }

      // Load Google Maps script
      await this.loadGoogleMapsScript(apiKey);
      
      console.log('[SafeRoute] Loading required Maps libraries...');
      const { Map } = await google.maps.importLibrary("maps");
      await google.maps.importLibrary("marker"); // Ensure marker is loaded globally
      
      // Default location (center of the world or some default)
      const defaultLocation = { lat: 0, lng: 0 };
      
      // Map styling (dark mode cyber theme)
      const darkModeStyle = [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
          featureType: "administrative.locality",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#263c3f" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6b9a76" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#38414e" }],
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212a37" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9ca5b3" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#746855" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1f2835" }],
        },
        {
          featureType: "road.highway",
          elementType: "labels.text.fill",
          stylers: [{ color: "#f3d19c" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#17263c" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#515c6d" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#17263c" }],
        },
      ];

      this.map = new Map(document.getElementById(containerId), {
        center: defaultLocation,
        zoom: 2,
        styles: darkModeStyle,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: true,
        fullscreenControl: true,
        mapId: 'DEMO_MAP_ID' // Required for AdvancedMarkerElement
      });

      console.log('[SafeRoute] Map loaded successfully.');
      this.isLoaded = true;
      return true;

    } catch (error) {
      console.error('[SafeRoute] Google Maps Error:', error);
      document.getElementById('mapError').classList.remove('hidden');
      document.getElementById('mapErrorText').textContent = error.message || 'Google Maps could not be loaded. Check the console for details.';
      return false;
    }
  },

  loadGoogleMapsScript(apiKey) {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps && window.google.maps.importLibrary) {
        resolve();
        return;
      }
      
      console.log('[SafeRoute] Initializing Maps Dynamic Library Import...');
      
      // Modern Google Maps Dynamic Library Import approach
      (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
        key: apiKey,
        v: "weekly"
      });

      // We resolve immediately because importLibrary will handle async loading of dependencies
      resolve();
    });
  },

  updateUserLocation(lat, lng) {
    if (!this.isLoaded) return;
    
    const pos = { lat, lng };
    
    // Create marker if it doesn't exist
    if (!this.userMarker) {
      const userPin = new google.maps.marker.PinElement({
        background: '#00f0ff',
        borderColor: '#ffffff',
        glyphColor: '#00f0ff',
        scale: 1.2
      });

      this.userMarker = new google.maps.marker.AdvancedMarkerElement({
        position: pos,
        map: this.map,
        title: 'Your Location',
        content: userPin.element
      });
    } else {
      this.userMarker.position = pos;
    }
    
    this.map.setCenter(pos);
    this.map.setZoom(15);
  },

  updateAccidentLocation(lat, lng) {
    if (!this.isLoaded) return;
    
    const pos = { lat, lng };
    
    // Create marker if it doesn't exist
    if (!this.accidentMarker) {
      const accidentPin = new google.maps.marker.PinElement({
        background: '#ef4444',
        borderColor: '#ffffff',
        glyphColor: '#ffffff',
        scale: 1.5
      });

      this.accidentMarker = new google.maps.marker.AdvancedMarkerElement({
        position: pos,
        map: this.map,
        title: 'Selected Accident Location',
        content: accidentPin.element
      });
    } else {
      this.accidentMarker.position = pos;
    }
  },

  setMapClickListener(callback) {
    if (!this.isLoaded || !this.map) return;
    
    this.map.addListener('click', (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      callback(lat, lng);
    });
  },

  centerMap(lat, lng, zoom = 16) {
    if (!this.isLoaded || !this.map) return;
    this.map.setCenter({ lat, lng });
    this.map.setZoom(zoom);
  },

  updateSelectedStationLocation(lat, lng) {
    if (!this.isLoaded) return;
    
    const pos = { lat, lng };
    
    // Create marker if it doesn't exist
    if (!this.selectedLocationMarker) {
      const stationPin = new google.maps.marker.PinElement({
        background: '#0284c7', // Blue
        borderColor: '#ffffff',
        glyphColor: '#ffffff',
        scale: 1.5
      });

      this.selectedLocationMarker = new google.maps.marker.AdvancedMarkerElement({
        position: pos,
        map: this.map,
        title: 'Selected Station Location',
        content: stationPin.element
      });
    } else {
      this.selectedLocationMarker.position = pos;
    }
  },

  hideSelectedStationLocation() {
    if (this.selectedLocationMarker) {
      this.selectedLocationMarker.map = null;
      this.selectedLocationMarker = null; // Reset so it can be cleanly recreated
    }
  },

  showLiveAmbulance(ambData) {
    if (!this.isLoaded || !this.map) return;
    if (!ambData || ambData.latitude == null || ambData.longitude == null) return;

    if (!this.ambulanceMarkers) this.ambulanceMarkers = new Map();
    if (!this.ambulanceCircles) this.ambulanceCircles = new Map();

    const ambId = ambData.ambulanceId || 'default_ambulance';
    const pos = { lat: ambData.latitude, lng: ambData.longitude };
    const radiusMeters = ambData.radiusThreshold || 350;

    // 1. Update or create Marker
    let marker = this.ambulanceMarkers.get(ambId);
    if (!marker) {
      // Create distinctive emergency vehicle icon container
      const markerDiv = document.createElement('div');
      markerDiv.className = 'relative flex items-center justify-center';
      markerDiv.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-lg shadow-2xl animate-pulse cursor-pointer">
          🚨
        </div>
        <div class="absolute -inset-2 rounded-full border border-rose-500/60 animate-ping pointer-events-none"></div>
      `;

      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
        marker = new google.maps.marker.AdvancedMarkerElement({
          position: pos,
          map: this.map,
          title: `Emergency Ambulance (${ambData.vehicleNumber || 'Live'})`,
          content: markerDiv,
          zIndex: 100
        });
      }
      this.ambulanceMarkers.set(ambId, marker);
    } else {
      marker.position = pos;
    }

    // 2. Update or create 350m Safety Zone Circle
    let circle = this.ambulanceCircles.get(ambId);
    if (!circle) {
      circle = new google.maps.Circle({
        strokeColor: '#ef4444',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.14,
        map: this.map,
        center: pos,
        radius: radiusMeters,
        zIndex: 50
      });
      this.ambulanceCircles.set(ambId, circle);
    } else {
      circle.setCenter(pos);
      circle.setRadius(radiusMeters);
    }
  },

  hideLiveAmbulance(ambulanceId) {
    const ambId = ambulanceId || 'default_ambulance';
    if (this.ambulanceMarkers && this.ambulanceMarkers.has(ambId)) {
      const marker = this.ambulanceMarkers.get(ambId);
      if (marker) marker.map = null;
      this.ambulanceMarkers.delete(ambId);
    }
    if (this.ambulanceCircles && this.ambulanceCircles.has(ambId)) {
      const circle = this.ambulanceCircles.get(ambId);
      if (circle) circle.setMap(null);
      this.ambulanceCircles.delete(ambId);
    }
  }
};

