document.addEventListener('DOMContentLoaded', async () => {
  // 1. Protect route
  if (!auth.protectRoute(['USER'])) {
    return; // Redirect happens in protectRoute
  }

  // 2. Initialize UI with user data
  const user = auth.getUser();
  if (user) {
    document.getElementById('currentUserName').textContent = user.name;
    document.getElementById('userInitial').textContent = user.name.charAt(0).toUpperCase();
  }

  // 3. Setup Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.logout();
  });

  // 4. Initialize Map
  await MapService.initMap('map');

  // 5. Setup Geolocation
  const useLocationBtn = document.getElementById('useLocationBtn');
  const latDisplay = document.getElementById('latDisplay');
  const lngDisplay = document.getElementById('lngDisplay');
  const locationError = document.getElementById('locationError');

  useLocationBtn.addEventListener('click', () => {
    locationError.classList.add('hidden');
    useLocationBtn.disabled = true;
    useLocationBtn.innerHTML = 'Locating...';

    if (!navigator.geolocation) {
      showLocationError('Geolocation is not supported by your browser');
      resetLocationBtn();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        latDisplay.textContent = lat.toFixed(6);
        lngDisplay.textContent = lng.toFixed(6);
        
        if (MapService.isLoaded) {
          MapService.updateUserLocation(lat, lng);
        }

        // Notify ClearLaneAlertService of active coordinates
        if (window.ClearLaneAlertService && typeof window.ClearLaneAlertService.updateUserLocation === 'function') {
          window.ClearLaneAlertService.updateUserLocation(lat, lng);
        }
        
        resetLocationBtn();
      },

      (error) => {
        let msg = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission denied by user. Map remains fully functional, but your location cannot be shown.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            msg = 'The request to get user location timed out.';
            break;
        }
        showLocationError(msg);
        resetLocationBtn();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });

  function showLocationError(msg) {
    locationError.textContent = msg;
    locationError.classList.remove('hidden');
  }

  function resetLocationBtn() {
    useLocationBtn.disabled = false;
    useLocationBtn.innerHTML = 'Update My Location';
  }

  // 6. Initialize Accident Location feature
  AccidentLocationService.init();

  // 7. Initialize Accident Photo feature
  AccidentPhotoService.init();

  // 8. Initialize Accident Submit feature
  AccidentSubmitService.init();
});
