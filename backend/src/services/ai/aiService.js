const GeminiProvider = require('./geminiProvider');
const OpenAIProvider = require('./openaiProvider');
const Accident = require('../../models/Accident');

class AIService {
  constructor() {
    this.providerName = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    this.provider = null;
  }

  // Lazy load provider to avoid crashing on boot if a key is missing but the provider isn't used
  getProvider() {
    if (this.provider) return this.provider;

    if (this.providerName === 'gemini') {
      this.provider = new GeminiProvider();
    } else if (this.providerName === 'openai') {
      this.provider = new OpenAIProvider();
    } else {
      throw new Error(`Unsupported AI_PROVIDER: ${this.providerName}`);
    }

    return this.provider;
  }

  async processAccident(accidentId) {
    try {
      const accident = await Accident.findById(accidentId);
      if (!accident) {
        throw new Error('Accident not found for AI processing');
      }

      const provider = this.getProvider();
      
      const aiResult = await provider.analyzeAccidentImage({
        imagePath: accident.imagePath,
        description: accident.description,
        accidentType: accident.accidentType
      });

      // Validate normalized result fields to ensure safety
      const validSeverities = ['Minor', 'Moderate', 'Severe', 'Unknown'];
      const severity = validSeverities.includes(aiResult.severity) ? aiResult.severity : 'Unknown';
      const confidence = (typeof aiResult.confidence === 'number' && aiResult.confidence >= 0 && aiResult.confidence <= 1) ? aiResult.confidence : 0;
      const detected = Boolean(aiResult.detected);

      // Store in DB securely without overwriting original data
      accident.aiAnalysis = {
        detected,
        severity,
        confidence,
        observations: String(aiResult.observations || '').trim(),
        provider: aiResult.provider,
        analyzedAt: new Date()
      };

      await accident.save();
      return accident.aiAnalysis;

    } catch (error) {
      console.error(`AI Service failed to process accident ${accidentId}:`, error);
      // We do not re-throw here because we don't want AI failure to break the submission flow.
      // The report stays safe in the DB.
      return null;
    }
  }
}

// Export a singleton instance
module.exports = new AIService();
