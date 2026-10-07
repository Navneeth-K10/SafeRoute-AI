const mongoose = require('mongoose');
require('dotenv').config();

async function runTest() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saferoute');
  const Accident = require('./src/models/Accident');
  const Hotspot = require('./src/models/Hotspot');
  const hotspotService = require('./src/services/hotspot/hotspotService');

  // Clean slate for testing
  await Hotspot.deleteMany({});
  
  // Create mock accidents
  const baseLat = 10.0;
  const baseLng = 10.0;
  const userObjId = new mongoose.Types.ObjectId();

  const createAccident = async (latOffset, lngOffset, status, severity, ageDays) => {
    const acc = new Accident({
      reportedBy: userObjId,
      accidentType: 'Test',
      severity,
      description: 'Test',
      latitude: baseLat + latOffset,
      longitude: baseLng + lngOffset,
      imagePath: 'test.jpg',
      status,
      createdAt: new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000)
    });
    await acc.save();
    return acc;
  };

  console.log('--- CASE 1: One verified accident ---');
  const acc1 = await createAccident(0, 0, 'VERIFIED', 'Minor', 1);
  await hotspotService.processVerifiedAccident(acc1._id);
  let hotspots = await Hotspot.find();
  console.log('Hotspots count (expected 0):', hotspots.length);

  console.log('\n--- CASE 2: Two verified accidents within 50m ---');
  // 0.0001 degrees is ~11 meters
  const acc2 = await createAccident(0.0001, 0, 'VERIFIED', 'Moderate', 2);
  await hotspotService.processVerifiedAccident(acc2._id);
  hotspots = await Hotspot.find();
  console.log('Hotspots count (expected 1):', hotspots.length);
  if (hotspots.length > 0) {
    console.log(`Risk Level: ${hotspots[0].riskLevel}, Score: ${hotspots[0].riskScore}, Count: ${hotspots[0].accidentCount}`);
  }

  console.log('\n--- CASE 3: Two verified accidents far apart from cluster 1 ---');
  // Far away (e.g., 0.1 degrees is ~11km)
  const acc3 = await createAccident(0.1, 0.1, 'VERIFIED', 'Severe', 5);
  await hotspotService.processVerifiedAccident(acc3._id); // Only 1 there, shouldn't create yet
  const acc4 = await createAccident(0.1001, 0.1, 'VERIFIED', 'Severe', 1);
  await hotspotService.processVerifiedAccident(acc4._id); // Should create 2nd cluster
  hotspots = await Hotspot.find();
  console.log('Hotspots count (expected 2):', hotspots.length);

  console.log('\n--- CASE 4/5: PENDING and REJECTED accidents near hotspot ---');
  const acc5 = await createAccident(0, 0.0001, 'PENDING', 'Severe', 1);
  const acc6 = await createAccident(0, 0.0002, 'REJECTED', 'Severe', 1);
  await hotspotService.processVerifiedAccident(acc5._id);
  await hotspotService.processVerifiedAccident(acc6._id);
  
  hotspots = await Hotspot.find();
  console.log('Hotspots count (expected 2):', hotspots.length);
  console.log(`Cluster 1 Accident Count (expected 2): ${hotspots[0].accidentCount}`);

  console.log('\n--- CASE 6/7/8: Risk score updates & Severity weight ---');
  const acc7 = await createAccident(0, 0.00015, 'VERIFIED', 'Severe', 0); // Recent Severe
  await hotspotService.processVerifiedAccident(acc7._id);
  hotspots = await Hotspot.find();
  console.log(`Cluster 1 Accident Count (expected 3): ${hotspots[0].accidentCount}`);
  console.log(`Updated Risk Score: ${hotspots[0].riskScore}`);

  console.log('\n--- CASE 9: Repeated recalculation ---');
  await hotspotService.processVerifiedAccident(acc7._id);
  hotspots = await Hotspot.find();
  console.log('Hotspots count (expected 2):', hotspots.length);

  console.log('\n--- CLEANUP ---');
  await Accident.deleteMany({ reportedBy: userObjId });
  await Hotspot.deleteMany({});
  
  process.exit(0);
}

runTest();
