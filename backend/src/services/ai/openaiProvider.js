const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class OpenAIProvider {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    if (!this.apiKey || this.apiKey === 'YOUR_OPENAI_KEY') {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.openai = new OpenAI({ apiKey: this.apiKey });
  }

  async analyzeAccidentImage({ imagePath, description, accidentType }) {
    try {
      const absoluteImagePath = path.join(__dirname, '../../../', imagePath);
      const base64Image = Buffer.from(fs.readFileSync(absoluteImagePath)).toString("base64");
      const mimeType = 'image/jpeg'; // Simplification

      const prompt = `
        Analyze this image of a reported ${accidentType || 'accident'}.
        The user described it as: "${description || 'No description provided'}".
        
        Provide your assessment of the accident evidence in the image.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "accident_analysis",
            schema: {
              type: "object",
              properties: {
                detected: { type: "boolean", description: "Whether the image appears to contain evidence of a road/vehicle accident." },
                severity: { type: "string", enum: ["Minor", "Moderate", "Severe", "Unknown"], description: "Estimated severity of the accident based on visible damage." },
                confidence: { type: "number", description: "Confidence score between 0 and 1." },
                observations: { type: "string", description: "Short factual observations about the damage, vehicles, and scene." }
              },
              required: ["detected", "severity", "confidence", "observations"],
              additionalProperties: false
            }
          }
        },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ],
          },
        ],
      });

      const responseText = response.choices[0].message.content;
      let aiResult;
      
      try {
        aiResult = JSON.parse(responseText);
      } catch (e) {
        console.error("OpenAI failed to return valid JSON", responseText);
        throw new Error('Invalid response format from OpenAI');
      }

      return {
        detected: Boolean(aiResult.detected),
        severity: aiResult.severity || 'Unknown',
        confidence: Number(aiResult.confidence) || 0,
        observations: aiResult.observations || '',
        provider: 'OpenAI'
      };
    } catch (error) {
      console.error('OpenAI Provider Error:', error);
      throw error;
    }
  }
}

module.exports = OpenAIProvider;
