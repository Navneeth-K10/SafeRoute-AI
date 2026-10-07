const mongoose = require('mongoose');
const aiService = require('./src/services/ai/aiService');
const Accident = require('./src/models/Accident');

require('dotenv').config();

async function testAI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saferoute');
    console.log('Connected to MongoDB');

    const latest = await Accident.findOne().sort({ createdAt: -1 });
    console.log('Latest accident ID:', latest._id);

    console.log('Running Gemini analysis manually...');
    const result = await aiService.processAccident(latest._id);
    
    console.log('Result:', result);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testAI();
