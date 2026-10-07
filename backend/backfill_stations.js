const mongoose = require('mongoose');
require('dotenv').config();
const Accident = require('./src/models/Accident');
const User = require('./src/models/User');
const { calculateDistanceKm } = require('./src/utils/distance');

async function backfillAccidents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all approved police stations with coordinates
    const policeStations = await User.find({
      role: 'POLICE',
      approvalStatus: 'APPROVED',
      latitude: { $ne: null },
      longitude: { $ne: null }
    });

    if (policeStations.length === 0) {
      console.log('No valid police stations found. Skipping backfill.');
      process.exit(0);
    }

    console.log(`Found ${policeStations.length} police stations.`);

    // Find pending accidents without an assigned police station
    const pendingUnassigned = await Accident.find({
      status: 'PENDING',
      assignedPoliceStation: null
    });

    console.log(`Found ${pendingUnassigned.length} pending, unassigned accidents.`);

    for (const accident of pendingUnassigned) {
      let assignedStationId = null;
      let minDistance = null;

      for (const station of policeStations) {
        const dist = calculateDistanceKm(
          accident.latitude,
          accident.longitude,
          station.latitude,
          station.longitude
        );
        if (minDistance === null || dist < minDistance) {
          minDistance = dist;
          assignedStationId = station._id;
        }
      }

      accident.assignedPoliceStation = assignedStationId;
      accident.assignmentDistanceKm = minDistance;
      await accident.save();

      console.log(`Assigned Accident ${accident._id} to Station ${assignedStationId} (${minDistance} km)`);
    }

    console.log('Backfill complete.');
    process.exit(0);
  } catch (error) {
    console.error('Backfill error:', error);
    process.exit(1);
  }
}

backfillAccidents();
