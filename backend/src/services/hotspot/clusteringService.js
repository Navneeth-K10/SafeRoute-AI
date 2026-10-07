/**
 * Calculates distance between two coordinates in meters using the Haversine formula
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
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
}

/**
 * Calculates the mean center of a cluster of accidents
 */
function calculateClusterCenter(accidents) {
  if (!accidents || accidents.length === 0) return { lat: 0, lng: 0 };
  
  const sum = accidents.reduce((acc, curr) => ({
    lat: acc.lat + curr.latitude,
    lng: acc.lng + curr.longitude
  }), { lat: 0, lng: 0 });
  
  return {
    lat: sum.lat / accidents.length,
    lng: sum.lng / accidents.length
  };
}

module.exports = {
  calculateDistanceMeters,
  calculateClusterCenter
};
