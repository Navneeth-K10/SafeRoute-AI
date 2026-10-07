const mongoose = require('mongoose');

const accidentSchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accidentType: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['Minor', 'Moderate', 'Severe'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  imagePath: {
    type: String,
    required: true
  },
  aiAnalysis: {
    detected: { type: Boolean },
    severity: { type: String, enum: ['Minor', 'Moderate', 'Severe', 'Unknown'] },
    confidence: { type: Number, min: 0, max: 1 },
    observations: { type: String },
    provider: { type: String },
    analyzedAt: { type: Date }
  },
  status: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: 'PENDING'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedPoliceStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignmentDistanceKm: {
    type: Number,
    default: null
  },
  assignedAmbulance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ambulanceAssignmentDistanceKm: {
    type: Number,
    default: null
  },
  ambulanceAlertStatus: {
    type: String,
    enum: ['NOT_SENT', 'SENT', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'NO_AMBULANCE_AVAILABLE'],
    default: 'NOT_SENT'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Accident', accidentSchema);
