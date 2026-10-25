const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/MP/SafeRoute/backend/.env' });
const Hotspot = require('c:/MP/SafeRoute/backend/src/models/Hotspot');
const Accident = require('c:/MP/SafeRoute/backend/src/models/Accident');
const hotspotService = require('c:/MP/SafeRoute/backend/src/services/hotspot/hotspotService');

async function runTest() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing for a clean test
  await Hotspot.deleteMany({});
  await Accident.deleteMany({});

  // 1. Create one accident
  const acc1 = await Accident.create({
    latitude: 9.2274,
    longitude: 76.6433,
    severity: 'MINOR',
    status: 'VERIFIED',
    description: 'Test accident 1'
  });

  await hotspotService.processVerifiedAccident(acc1._id);

  let hotspots = await Hotspot.find();
  console.log(`TEST 1: 1 accident -> ${hotspots.length} hotspots. Expected: 1`);
  console.log(`Hotspot details: riskScore=${hotspots[0].riskScore}, level=${hotspots[0].riskLevel}, count=${hotspots[0].accidentCount}`);

  // 2. Create another accident nearby
  const acc2 = await Accident.create({
    latitude: 9.2275, // very close
    longitude: 76.6434,
    severity: 'SEVERE',
    status: 'VERIFIED',
    description: 'Test accident 2'
  });

  await hotspotService.processVerifiedAccident(acc2._id);

  hotspots = await Hotspot.find();
  console.log(`TEST 2: 2 accidents nearby -> ${hotspots.length} hotspots. Expected: 1`);
  console.log(`Hotspot details: riskScore=${hotspots[0].riskScore}, level=${hotspots[0].riskLevel}, count=${hotspots[0].accidentCount}`);
  
  // 3. Create another accident far away
  const acc3 = await Accident.create({
    latitude: 10.0, // far
    longitude: 76.0,
    severity: 'MODERATE',
    status: 'VERIFIED',
    description: 'Test accident 3'
  });

  await hotspotService.processVerifiedAccident(acc3._id);

  hotspots = await Hotspot.find();
  console.log(`TEST 3: 1 far accident -> ${hotspots.length} hotspots. Expected: 2`);
  
  // 4. Create PENDING nearby
  const acc4 = await Accident.create({
    latitude: 9.2276, 
    longitude: 76.6435,
    severity: 'SEVERE',
    status: 'PENDING',
    description: 'Test accident 4'
  });
  
  await hotspotService.processVerifiedAccident(acc4._id);
  hotspots = await Hotspot.find();
  // Should not have affected the first hotspot (count should still be 2)
  const hs1 = hotspots.find(h => h.accidentCount === 2);
  console.log(`TEST 4: PENDING nearby -> First hotspot count=${hs1 ? hs1.accidentCount : 'N/A'}. Expected: 2`);

  await mongoose.disconnect();
}

runTest().catch(console.error);
