const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

class GeminiProvider {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_KEY') {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  // Convert local file to GenerativePart format for Gemini
  _fileToGenerativePart(filePath) {
    const mimeType = 'image/jpeg'; // Assuming jpeg for simplicity, or we could infer from extension
    return {
      inlineData: {
        data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
        mimeType
      },
    };
  }

  async analyzeAccidentImage({ imagePath, description, accidentType }) {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
      
      const absoluteImagePath = path.join(__dirname, '../../../', imagePath);
      const imagePart = this._fileToGenerativePart(absoluteImagePath);
      
      const prompt = `
        Analyze this image of a reported ${accidentType || 'accident'}.
        The user described it as: "${description || 'No description provided'}".
        
        Provide your assessment of the accident evidence in the image.
      `;

      // Use structured output schema if supported, or JSON generation config
      const generationConfig = {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            detected: {
              type: SchemaType.BOOLEAN,
              description: "Whether the image appears to contain evidence of a road/vehicle accident."
            },
            severity: {
              type: SchemaType.STRING,
              description: "Estimated severity of the accident based on visible damage.",
              enum: ["Minor", "Moderate", "Severe", "Unknown"]
            },
            confidence: {
              type: SchemaType.NUMBER,
              description: "Confidence score between 0 and 1."
            },
            observations: {
              type: SchemaType.STRING,
              description: "Short factual observations about the damage, vehicles, and scene."
            }
          },
          required: ["detected", "severity", "confidence", "observations"]
        }
      };

      let result;
      let retries = 0;
      const maxRetries = 2;
      
      while (retries <= maxRetries) {
        try {
          result = await model.generateContent({
            contents: [{ role: 'user', parts: [ { text: prompt }, imagePart ] }],
            generationConfig
          });
          break; // Success, exit loop
        } catch (err) {
          if (err.message && err.message.includes('503') && retries < maxRetries) {
            retries++;
            console.log(`Gemini 503 error, retrying (${retries}/${maxRetries}) in 1s...`);
            await new Promise(res => setTimeout(res, 1000));
          } else {
            throw err;
          }
        }
      }
      
      const responseText = result.response.text();
      let aiResult;
      
      try {
        aiResult = JSON.parse(responseText);
      } catch (e) {
        console.error("Gemini failed to return valid JSON", responseText);
        throw new Error('Invalid response format from Gemini');
      }

      return {
        detected: Boolean(aiResult.detected),
        severity: aiResult.severity || 'Unknown',
        confidence: Number(aiResult.confidence) || 0,
        observations: aiResult.observations || '',
        provider: 'Gemini'
      };
    } catch (error) {
      console.error('Gemini Provider Error:', error);
      throw error;
    }
  }
}

module.exports = GeminiProvider;
