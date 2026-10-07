const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./src/models/User');

require('dotenv').config();

async function testSubmission() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saferoute');
    console.log('Connected to MongoDB');

    const user = await User.findOne({ role: 'USER' });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );
    console.log(`Using USER token for: ${user.name}`);

    const ambulance = await User.findOne({ role: 'AMBULANCE' });
    if (ambulance) {
      ambulance.availabilityStatus = 'AVAILABLE';
      ambulance.latitude = 9.20;
      ambulance.longitude = 76.70;
      await ambulance.save();
      console.log(`Set AMBULANCE ${ambulance.ambulanceName} to AVAILABLE`);
    }

    const FormData = require('form-data');
    const form = new FormData();
    form.append('accidentType', 'Collision');
    form.append('severity', 'Severe');
    form.append('description', 'Test accident with Gemini 3.1 Flash Lite');
    form.append('latitude', '9.201');
    form.append('longitude', '76.701');
    
    const imagePath = path.join(__dirname, 'uploads', 'accidents', 'dummy.jpg');
    form.append('image', fs.createReadStream(imagePath));

    console.log('Submitting accident via API...');
    const fetch = require('node-fetch'); // Node 18+ has global fetch, but we can also use 'axios' if installed. Wait, axios wasn't. Let's just use global fetch.
    
    // In node 18+, FormData from 'form-data' is NOT the standard DOM FormData. We have to construct raw request or use the form-data getHeaders().
    // We will just use the global fetch with standard DOM FormData.
  } catch(e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}
testSubmission();
