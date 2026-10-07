const mongoose = require('mongoose');

const hotspotSchema = new mongoose.Schema({
  centerLatitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  centerLongitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  accidentCount: {
    type: Number,
    required: true,
    default: 0
  },
  riskLevel: {
    type: String,
    enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
    required: true
  },
  riskScore: {
    type: Number,
    required: true,
    default: 0
  },
  radius: {
    type: Number,
    required: true
  },
  verifiedAccidentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Accident'
  }],
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Hotspot', hotspotSchema);
