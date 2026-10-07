const Hotspot = require('../../models/Hotspot');
const Accident = require('../../models/Accident');
const clusteringService = require('./clusteringService');
const riskService = require('./riskService');

const CLUSTER_RADIUS_METERS = parseFloat(process.env.HOTSPOT_CLUSTER_RADIUS_METERS) || 50;
const MIN_ACCIDENTS = 1;

/**
 * Process a newly verified accident to see if it creates or updates a hotspot.
 * Designed to be idempotent.
 */
async function processVerifiedAccident(accidentId) {
  try {
    const accident = await Accident.findById(accidentId);
    if (!accident || accident.status !== 'VERIFIED') {
      console.log(`[HOTSPOT ENGINE] Accident ${accidentId} is not verified. Skipping.`);
      return;
    }

    if (accident.latitude == null || accident.longitude == null) {
      console.log(`[HOTSPOT ENGINE] Accident ${accidentId} lacks coordinates. Skipping.`);
      return;
    }

    console.log(`[HOTSPOT ENGINE] Verified accident received: ${accidentId}`);
    console.log(`[HOTSPOT ENGINE] Cluster calculation started`);

    // 1. Is this accident already in a hotspot? (Idempotency check)
    const existingHotspotForAccident = await Hotspot.findOne({ verifiedAccidentIds: accidentId });
    if (existingHotspotForAccident) {
      console.log(`[HOTSPOT ENGINE] Accident ${accidentId} is already in hotspot ${existingHotspotForAccident._id}. Recalculating...`);
      await recalculateHotspot(existingHotspotForAccident);
      return;
    }

    // 2. Find the closest existing hotspot whose center is within CLUSTER_RADIUS_METERS
    const allHotspots = await Hotspot.find();
    let closestHotspot = null;
    let minDistance = Infinity;

    for (const hs of allHotspots) {
      const dist = clusteringService.calculateDistanceMeters(
        accident.latitude, accident.longitude,
        hs.centerLatitude, hs.centerLongitude
      );
      if (dist <= CLUSTER_RADIUS_METERS && dist < minDistance) {
        minDistance = dist;
        closestHotspot = hs;
      }
    }

    // 3. If a nearby hotspot exists, add this accident to it and recalculate
    if (closestHotspot) {
      console.log(`[HOTSPOT ENGINE] Cluster found. Adding accident to existing hotspot ${closestHotspot._id}`);
      
      // Prevent duplicates in array just in case
      if (!closestHotspot.verifiedAccidentIds.includes(accident._id)) {
        closestHotspot.verifiedAccidentIds.push(accident._id);
      }
      
      await recalculateHotspot(closestHotspot);
      console.log(`[HOTSPOT ENGINE] Hotspot updated`);
      return;
    }

    // 4. No nearby hotspot. Let's see if we can form a NEW cluster.
    // Find all VERIFIED accidents that are NOT in any hotspot, and are within CLUSTER_RADIUS_METERS of THIS accident.
    const allVerifiedAccidents = await Accident.find({ 
      status: 'VERIFIED',
      _id: { $ne: accident._id },
      latitude: { $ne: null },
      longitude: { $ne: null }
    });

    const nearbyUnassignedAccidents = [];
    for (const otherAcc of allVerifiedAccidents) {
      const dist = clusteringService.calculateDistanceMeters(
        accident.latitude, accident.longitude,
        otherAcc.latitude, otherAcc.longitude
      );
      
      if (dist <= CLUSTER_RADIUS_METERS) {
        // Check if otherAcc is already in a hotspot
        const inHotspot = await Hotspot.exists({ verifiedAccidentIds: otherAcc._id });
        if (!inHotspot) {
          nearbyUnassignedAccidents.push(otherAcc);
        }
      }
    }

    // 5. Does the cluster meet the minimum size?
    const clusterAccidents = [accident, ...nearbyUnassignedAccidents];
    
    if (clusterAccidents.length >= MIN_ACCIDENTS) {
      console.log(`[HOTSPOT ENGINE] Cluster created! Found ${clusterAccidents.length} accidents to form a new hotspot.`);
      
      const newHotspot = new Hotspot({
        radius: CLUSTER_RADIUS_METERS,
        verifiedAccidentIds: clusterAccidents.map(a => a._id)
      });
      
      await recalculateHotspot(newHotspot, clusterAccidents);
      console.log(`[HOTSPOT ENGINE] New Hotspot created with ID ${newHotspot._id}`);
    } else {
      console.log(`[HOTSPOT ENGINE] Cluster too small (${clusterAccidents.length} accidents). No hotspot created.`);
    }

  } catch (error) {
    console.error(`[HOTSPOT ENGINE] Error processing accident ${accidentId}:`, error);
    // Don't rethrow to avoid breaking police verification
  }
}

/**
 * Recalculate a hotspot's center, risk score, and risk level.
 * Optionally accept pre-fetched accidents array to save DB queries.
 */
async function recalculateHotspot(hotspot, prefetchedAccidents = null) {
  let accidents = prefetchedAccidents;
  
  if (!accidents) {
    accidents = await Accident.find({ _id: { $in: hotspot.verifiedAccidentIds } });
  }

  // Double check all accidents are still VERIFIED (handle if one was rejected later)
  const verifiedAccidents = accidents.filter(a => a.status === 'VERIFIED');
  
  if (verifiedAccidents.length < hotspot.verifiedAccidentIds.length) {
    console.log(`[HOTSPOT ENGINE] Warning: Some accidents in hotspot ${hotspot._id} are no longer VERIFIED. Removing them.`);
    hotspot.verifiedAccidentIds = verifiedAccidents.map(a => a._id);
  }

  // If the hotspot now has too few accidents, delete it.
  if (verifiedAccidents.length < MIN_ACCIDENTS) {
    console.log(`[HOTSPOT ENGINE] Hotspot ${hotspot._id} fell below MIN_ACCIDENTS (${verifiedAccidents.length}). Deleting.`);
    if (!hotspot.isNew) {
      await Hotspot.findByIdAndDelete(hotspot._id);
    }
    return;
  }
  
  // 1. Recalculate Center
  const center = clusteringService.calculateClusterCenter(verifiedAccidents);
  hotspot.centerLatitude = center.lat;
  hotspot.centerLongitude = center.lng;

  // 2. Calculate Risk
  const riskScore = riskService.calculateRiskScore(verifiedAccidents);
  const riskLevel = riskService.getRiskLevel(riskScore);
  
  hotspot.accidentCount = verifiedAccidents.length;
  hotspot.riskScore = riskScore;
  hotspot.riskLevel = riskLevel;
  
  hotspot.lastUpdatedAt = new Date();
  await hotspot.save();
  console.log(`[HOTSPOT ENGINE] Risk recalculated for hotspot ${hotspot._id}. Score: ${hotspot.riskScore} (${hotspot.riskLevel})`);
}

module.exports = {
  processVerifiedAccident,
  recalculateHotspot
};
