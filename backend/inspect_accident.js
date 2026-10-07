const mongoose = require('mongoose');
const Accident = require('./src/models/Accident');
const User = require('./src/models/User');
require('dotenv').config();

async function inspectLatestAccident() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saferoute');
    console.log('Connected to MongoDB');

    const latestAccidents = await Accident.find().sort({ createdAt: -1 }).limit(3);
    
    console.log('--- LATEST 3 ACCIDENTS ---');
    latestAccidents.forEach((acc, i) => {
      console.log(`\n[${i+1}] ID: ${acc._id}`);
      console.log(`Type: ${acc.accidentType}`);
      console.log(`Created At: ${acc.createdAt}`);
      console.log(`Status: ${acc.status}`);
      console.log(`AI Analysis:`, acc.aiAnalysis);
      console.log(`Assigned Ambulance: ${acc.assignedAmbulance}`);
      console.log(`Ambulance Alert Status: ${acc.ambulanceAlertStatus}`);
    });

    const ambulances = await User.find({ role: 'AMBULANCE' });
    console.log(`\n--- AMBULANCES (${ambulances.length}) ---`);
    ambulances.forEach(amb => {
      console.log(`ID: ${amb._id}, Name: ${amb.ambulanceName}, Status: ${amb.availabilityStatus}, Loc: ${amb.latitude}, ${amb.longitude}`);
    });

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

inspectLatestAccident();
