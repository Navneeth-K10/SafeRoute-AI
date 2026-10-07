const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['USER', 'POLICE', 'AMBULANCE', 'ADMIN'],
    default: 'USER'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Police Station specific fields
  stationName: {
    type: String,
    trim: true
  },
  stationCode: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  latitude: {
    type: Number,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    min: -180,
    max: 180
  },
  approvalStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  // Ambulance specific fields
  ambulanceName: {
    type: String,
    trim: true
  },
  vehicleNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  driverName: {
    type: String,
    trim: true
  },
  availabilityStatus: {
    type: String,
    enum: ['AVAILABLE', 'OFFLINE', 'BUSY'],
    default: 'AVAILABLE'
  },
  isLiveMode: {
    type: Boolean,
    default: false
  },
  liveSpeed: {
    type: Number,
    default: 0
  },
  liveHeading: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save hook to hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to check password validity
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to return user info without password
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
