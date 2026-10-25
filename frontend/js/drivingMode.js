const DrivingModeService = {
  isActive: false,
  directionsService: null,
  directionsRenderer: null,
  autocomplete: null,
  destinationPlace: null,
  watchId: null,

  elements: {},

  init() {
    this.elements = {
      startBtn: document.getElementById('startDrivingModeBtn'),
      controlContainer: document.getElementById('startDrivingModeControl'),
      
      destPanel: document.getElementById('drivingDestinationPanel'),
      searchBtn: document.getElementById('searchDestinationBtn'),
      routePreview: document.getElementById('routeInfoPreview'),
      cancelBtn: document.getElementById('cancelDrivingBtn'),
      confirmBtn: document.getElementById('confirmDrivingBtn'),
      
      activeNavPanel: document.getElementById('activeNavigationPanel'),
      navDestName: document.getElementById('navDestinationName'),
      navDistance: document.getElementById('navDistance'),
      navDuration: document.getElementById('navDuration'),
      endBtn: document.getElementById('endDrivingBtn')
    };

    this.bindEvents();
    this.waitForMap();
  },

  bindEvents() {
    this.elements.startBtn.addEventListener('click', () => this.showDestinationPanel());
    this.elements.cancelBtn.addEventListener('click', () => this.cancelDrivingSetup());
    this.elements.searchBtn.addEventListener('click', () => this.calculateRoute());
    this.elements.confirmBtn.addEventListener('click', () => this.startDriving());
    this.elements.endBtn.addEventListener('click', () => this.stopDriving());

    // Subscribe to proximity for seamless map location updates
    if (window.SafeRouteHotspotProximity) {
      window.SafeRouteHotspotProximity.subscribe((prox) => {
        if (this.isActive && prox && prox.userLatitude) {
          // Update user location on map visually while driving
          if (MapService && MapService.updateUserLocation) {
            MapService.updateUserLocation(prox.userLatitude, prox.userLongitude);
          }
          // Update ClearLaneAlertService for real-time 350m ambulance detection
          if (window.ClearLaneAlertService && typeof window.ClearLaneAlertService.updateUserLocation === 'function') {
            window.ClearLaneAlertService.updateUserLocation(prox.userLatitude, prox.userLongitude);
          }
        }
      });
    }

  },

  waitForMap() {
    const checkInterval = setInterval(() => {
      if (MapService && MapService.isLoaded && MapService.map) {
        clearInterval(checkInterval);
        this.initGoogleMapsServices();
      }
    }, 500);
  },

  async initGoogleMapsServices() {
    try {
      console.log('[SafeRoute] Maps initialization status: OK');
      console.log('[SafeRoute] Loading Places and Geometry libraries...');
      
      const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");
      const { encoding } = await google.maps.importLibrary("geometry");
      console.log('[SafeRoute] Places & Geometry initialization status: OK');

      this.PlaceAutocompleteElementClass = PlaceAutocompleteElement;
      this.geometryEncoding = encoding;

      console.log('[DRIVING MODE] Services initialized successfully.');
    } catch (error) {
      console.error('[DRIVING MODE] Failed to load Google Maps libraries:', error);
    }
  },

  showDestinationPanel() {
    this.elements.controlContainer.classList.add('hidden');
    this.elements.destPanel.classList.remove('hidden');
    
    // Create the widget dynamically while the modal is VISIBLE to prevent layout/bounding box bugs
    this.initAutocompleteWidget();
    
    this.elements.routePreview.classList.add('hidden');
    this.elements.confirmBtn.classList.add('hidden');
    this.destinationPlace = null;
    
    // Ensure route is cleared
    if (this.routePolyline) {
      this.routePolyline.setMap(null);
      this.routePolyline = null;
    }
  },

  initAutocompleteWidget() {
    if (!this.PlaceAutocompleteElementClass) return;

    const container = document.getElementById('destinationInputContainer');
    
    // Clean up old instance if it exists
    if (this.autocomplete) {
      this.autocomplete.remove();
      this.autocomplete = null;
    }
    
    container.innerHTML = ''; // Clear container

    // Instantiate fresh widget
    this.autocomplete = new this.PlaceAutocompleteElementClass();
    
    // IMPORTANT: The new Places API uses includedRegionCodes, not componentRestrictions
    this.autocomplete.includedRegionCodes = ['in'];
    
    container.appendChild(this.autocomplete);

    if (MapService && MapService.map) {
      this.autocomplete.locationBias = MapService.map.getBounds();
    }

    const handleSelection = async (event) => {
      // The event payload might be a Place or a PlacePrediction depending on API version
      let place = event.place || event.placePrediction;
      if (!place) {
        this.showRouteError('Please select a valid place from the suggestions.');
        return;
      }

      // Hide error if valid
      this.elements.routePreview.classList.add('hidden');
      
      try {
        // If it's a prediction, we must convert it to a Place object first
        if (typeof place.toPlace === 'function') {
          place = place.toPlace();
        }

        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
        if (!place.location) {
          this.showRouteError('Could not retrieve coordinates for this location.');
          return;
        }
        this.destinationPlace = place;
        this.addDestinationMarker(place.location);
      } catch (e) {
        console.error('[DRIVING MODE] Error fetching place details:', e);
        this.showRouteError('Failed to fetch place details.');
      }
    };

    this.autocomplete.addEventListener('gmp-placeselect', handleSelection);
    this.autocomplete.addEventListener('gmp-select', handleSelection);
  },

  cancelDrivingSetup() {
    this.elements.destPanel.classList.add('hidden');
    this.elements.controlContainer.classList.remove('hidden');
    if (this.routePolyline) {
      this.routePolyline.setMap(null);
      this.routePolyline = null;
    }
    if (this.destinationMarker) {
      this.destinationMarker.map = null;
      this.destinationMarker = null;
    }
  },

  addDestinationMarker(location) {
    if (this.destinationMarker) {
      this.destinationMarker.map = null;
    }
    
    const pinElement = new google.maps.marker.PinElement({
      background: '#4f46e5', // Indigo
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      scale: 1.2
    });

    this.destinationMarker = new google.maps.marker.AdvancedMarkerElement({
      position: location,
      map: MapService.map,
      title: 'Destination',
      content: pinElement.element,
      zIndex: 10
    });
    
    // Pan to destination
    MapService.map.panTo(location);
    MapService.map.setZoom(15);
  },

  calculateRoute() {
    if (!this.destinationPlace || !this.destinationPlace.location) {
      this.showRouteError('Please select a valid place from the suggestions first.');
      return;
    }

    this.elements.searchBtn.textContent = '...';
    this.elements.searchBtn.disabled = true;

    if (!navigator.geolocation) {
      this.showRouteError('Geolocation not supported.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const originLat = position.coords.latitude;
        const originLng = position.coords.longitude;
        
        const dest = this.destinationPlace.location;
        const destLat = typeof dest.lat === 'function' ? dest.lat() : dest.lat;
        const destLng = typeof dest.lng === 'function' ? dest.lng() : dest.lng;

        console.log('[DRIVING MODE] ROUTE ORIGIN:', originLat, originLng);
        console.log('[DRIVING MODE] ROUTE DESTINATION:', destLat, destLng);

        const requestBody = {
          origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
          destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          polylineQuality: "OVERVIEW"
        };

        try {
          const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': SafeRouteConfig.GOOGLE_MAPS_API_KEY,
              'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration'
            },
            body: JSON.stringify(requestBody)
          });

          console.log('[DRIVING MODE] ROUTES API HTTP STATUS:', response.status);
          
          if (!response.ok) {
            const errBody = await response.json();
            console.error('[DRIVING MODE] ROUTES API RESPONSE ERROR:', errBody);
            this.elements.searchBtn.textContent = 'Search';
            this.elements.searchBtn.disabled = false;
            this.showRouteError('Route service error. Please check console.');
            return;
          }

          const data = await response.json();
          console.log('[DRIVING MODE] ROUTES API RESPONSE:', data);
          
          this.elements.searchBtn.textContent = 'Search';
          this.elements.searchBtn.disabled = false;

          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const encodedPolyline = route.polyline.encodedPolyline;
            
            // Clear existing route
            if (this.routePolyline) {
              this.routePolyline.setMap(null);
            }

            // Decode and draw polyline
            const path = this.geometryEncoding ? this.geometryEncoding.decodePath(encodedPolyline) : [];
            this.routePolyline = new google.maps.Polyline({
              path: path,
              map: MapService.map,
              strokeColor: '#4f46e5',
              strokeWeight: 5,
              strokeOpacity: 0.8
            });

            // Fit bounds to polyline
            const bounds = new google.maps.LatLngBounds();
            path.forEach(p => bounds.extend(p));
            MapService.map.fitBounds(bounds);

            // Format UI
            const destName = this.destinationPlace.displayName || 'Destination';
            const distKm = (route.distanceMeters / 1000).toFixed(1) + ' km';
            const durationMins = Math.round(parseInt(route.duration) / 60) + ' min';

            this.elements.routePreview.innerHTML = `
              <div class="font-bold text-white mb-1">${destName}</div>
              <div class="flex gap-4">
                <span>Distance: <span class="text-white">${distKm}</span></span>
                <span>ETA: <span class="text-emerald-400">${durationMins}</span></span>
              </div>
            `;
            this.elements.routePreview.classList.remove('hidden');
            this.elements.confirmBtn.classList.remove('hidden');
            
            this.navDetails = {
              name: destName,
              distance: distKm,
              duration: durationMins
            };
          } else {
            this.showRouteError('No route found.');
          }
        } catch (error) {
          console.error('[DRIVING MODE] Route fetch failed:', error);
          this.elements.searchBtn.textContent = 'Search';
          this.elements.searchBtn.disabled = false;
          this.showRouteError('Could not connect to routing service.');
        }
      },
      (error) => {
        this.elements.searchBtn.textContent = 'Search';
        this.elements.searchBtn.disabled = false;
        this.showRouteError('Could not get current location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  },

  showRouteError(msg) {
    this.elements.routePreview.innerHTML = `<span class="text-rose-400">${msg}</span>`;
    this.elements.routePreview.classList.remove('hidden');
    this.elements.confirmBtn.classList.add('hidden');
  },

  startDriving() {
    this.isActive = true;
    
    // Hide Setup Panels
    this.elements.destPanel.classList.add('hidden');
    this.elements.controlContainer.classList.add('hidden');
    
    // Show Active Navigation Panel
    this.elements.navDestName.textContent = this.navDetails.name;
    this.elements.navDistance.textContent = this.navDetails.distance;
    this.elements.navDuration.textContent = this.navDetails.duration;
    this.elements.activeNavPanel.classList.remove('hidden');

    // Start Proximity Engine (this starts continuous GPS watcher and Warning UI)
    if (window.SafeRouteHotspotProximity) {
      window.SafeRouteHotspotProximity.start();
    }
  },

  stopDriving() {
    this.isActive = false;
    
    // Hide Active Panel
    this.elements.activeNavPanel.classList.add('hidden');
    
    // Show Control Button
    this.elements.controlContainer.classList.remove('hidden');
    
    // Clear Route
    if (this.routePolyline) {
      this.routePolyline.setMap(null);
      this.routePolyline = null;
    }
    if (this.destinationMarker) {
      this.destinationMarker.map = null;
      this.destinationMarker = null;
    }

    // Stop Proximity Engine (this stops GPS watcher and automatically hides Warning UI)
    if (window.SafeRouteHotspotProximity) {
      window.SafeRouteHotspotProximity.stop();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  DrivingModeService.init();
});
