const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // token valid for 7 days
  );
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Create user (force role to USER)
    const user = new User({
      name,
      email,
      password,
      phone,
      role: 'USER' // Always force to USER for public registration
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.registerPolice = async (req, res) => {
  try {
    const { stationName, stationCode, email, phone, address, city, district, state, latitude, longitude, password } = req.body;
    
    // Validate required fields
    if (!stationName || !email || !password || !phone || !address || !city || !district || !state || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, message: 'Invalid latitude' });
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Invalid longitude' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Create police user
    const police = new User({
      name: stationName, // use stationName as name
      stationName,
      stationCode,
      email,
      phone,
      address,
      city,
      district,
      state,
      latitude: lat,
      longitude: lng,
      password,
      role: 'POLICE',
      approvalStatus: 'PENDING'
    });

    await police.save();

    res.status(201).json({
      success: true,
      message: 'Police Station registered successfully',
      data: {
        user: {
          id: police._id,
          name: police.name,
          email: police.email,
          role: police.role,
          stationName: police.stationName
        }
      }
    });

  } catch (error) {
    console.error('Police Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    // Check approval status for POLICE and AMBULANCE
    if (user.role === 'POLICE' || user.role === 'AMBULANCE') {
      if (user.approvalStatus === 'PENDING') {
        return res.status(403).json({ success: false, message: 'Your account is awaiting admin approval.' });
      }
      if (user.approvalStatus === 'REJECTED') {
        return res.status(403).json({ success: false, message: 'Your account has been rejected by the administrator.' });
      }
      if (user.approvalStatus !== 'APPROVED') {
        return res.status(403).json({ success: false, message: 'Your account is not approved.' });
      }
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.registerAmbulance = async (req, res) => {
  try {
    const { ambulanceName, vehicleNumber, driverName, email, phone, address, city, district, state, latitude, longitude, password } = req.body;
    
    // Validate required fields
    if (!ambulanceName || !vehicleNumber || !driverName || !email || !password || !phone || !address || !city || !district || !state || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, message: 'Invalid latitude' });
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Invalid longitude' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Check if vehicle number already exists
    const existingVehicle = await User.findOne({ vehicleNumber: vehicleNumber });
    if (existingVehicle) {
      return res.status(409).json({ success: false, message: 'Vehicle number already registered' });
    }

    // Create ambulance user
    const ambulance = new User({
      name: ambulanceName, // use ambulanceName as general name
      ambulanceName,
      vehicleNumber,
      driverName,
      email,
      phone,
      address,
      city,
      district,
      state,
      latitude: lat,
      longitude: lng,
      password,
      role: 'AMBULANCE',
      approvalStatus: 'PENDING',
      availabilityStatus: 'AVAILABLE'
    });

    await ambulance.save();

    res.status(201).json({
      success: true,
      message: 'Ambulance registered successfully',
      data: {
        user: {
          id: ambulance._id,
          name: ambulance.name,
          email: ambulance.email,
          role: ambulance.role,
          ambulanceName: ambulance.ambulanceName,
          vehicleNumber: ambulance.vehicleNumber
        }
      }
    });

  } catch (error) {
    console.error('Ambulance Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    const user = await User.findById(req.user.userId).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          stationName: user.stationName,
          latitude: user.latitude,
          longitude: user.longitude,
          approvalStatus: user.approvalStatus,
          ambulanceName: user.ambulanceName,
          vehicleNumber: user.vehicleNumber,
          driverName: user.driverName,
          availabilityStatus: user.availabilityStatus
        }
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Invalid latitude or longitude coordinates' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.latitude = lat;
    user.longitude = lng;
    await user.save();

    const socketManager = require('../sockets/socketManager');
    socketManager.handleUserLocationUpdate(req.user.userId, lat, lng);

    res.json({
      success: true,
      message: 'User location updated successfully',
      data: { latitude: lat, longitude: lng }
    });
  } catch (error) {
    console.error('Update user location error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

