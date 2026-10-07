const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const accidentController = require('./src/controllers/accidentController');
const User = require('./src/models/User');

// Mock aiService
const aiService = require('./src/services/ai/aiService');
aiService.processAccident = async (id) => {
  return {
    detected: true,
    severity: 'Severe',
    confidence: 0.99,
    observations: 'Mock observations',
    provider: 'Mock AI'
  };
};

async function runDebug() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('DB Connected');
  
  // Clean up previous test users for a fresh test
  await User.deleteMany({ email: /debug_/ });

  // 1. Create Ambulance
  const amb = new User({
    name: 'Debug Ambulance',
    ambulanceName: 'Debug Amb',
    vehicleNumber: `DBG-${Date.now()}`,
    driverName: 'Driver X',
    email: `debug_${Date.now()}@test.com`,
    phone: '123',
    address: 'X',
    city: 'X',
    district: 'X',
    state: 'X',
    latitude: 9.15,
    longitude: 76.7,
    password: 'password123',
    role: 'AMBULANCE',
    approvalStatus: 'APPROVED',
    availabilityStatus: 'AVAILABLE'
  });
  await amb.save();
  console.log(`Created Ambulance: ${amb._id}`);

  // 2. Create User
  const usr = new User({
    name: 'Debug User',
    email: `debug_user_${Date.now()}@test.com`,
    password: 'password123',
    role: 'USER'
  });
  await usr.save();

  // 3. Mock req, res
  const req = {
    user: { userId: usr._id, role: 'USER' },
    body: {
      accidentType: 'Vehicle Collision',
      severity: 'Severe',
      description: 'Test accident',
      latitude: '9.16',
      longitude: '76.71'
    },
    file: {
      filename: 'debug_image.jpg'
    }
  };

  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log('Response JSON:', data);
    }
  };

  // 4. Run Controller
  await accidentController.createAccident(req, res);

  console.log('\n--- FETCH EMERGENCIES ---');
  const req2 = {
    user: { userId: amb._id, role: 'AMBULANCE' }
  };
  const ambulanceController = require('./src/controllers/ambulanceController');
  await ambulanceController.getEmergencies(req2, res);

  process.exit(0);
}

runDebug().catch(console.error);
