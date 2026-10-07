const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    console.log(JSON.stringify(data.models.find(m => m.name === 'models/gemini-3.8-flash'), null, 2));
  } catch (err) {
    console.error(err);
  }
}
listModels();
