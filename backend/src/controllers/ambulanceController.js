const User = require('../models/User');

exports.updateLocation = async (req, res) => {
  try {
    if (req.user.role !== 'AMBULANCE') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only ambulance users can update location' });
    }

    const { latitude, longitude } = req.body;
    
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, message: 'Invalid latitude' });
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Invalid longitude' });
    }

    const ambulance = await User.findById(req.user.userId);
    if (!ambulance) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }

    ambulance.latitude = lat;
    ambulance.longitude = lng;
    await ambulance.save();

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        latitude: lat,
        longitude: lng
      }
    });

  } catch (error) {
    console.error('Update ambulance location error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    if (req.user.role !== 'AMBULANCE') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only ambulance users can update status' });
    }

    const { status } = req.body;
    
    if (!['AVAILABLE', 'OFFLINE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Allowed: AVAILABLE, OFFLINE' });
    }

    const ambulance = await User.findById(req.user.userId);
    if (!ambulance) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }

    // Protect against overwriting BUSY if it gets set in the future
    if (ambulance.availabilityStatus === 'BUSY') {
      return res.status(400).json({ success: false, message: 'Cannot manually change status while BUSY with an emergency' });
    }

    ambulance.availabilityStatus = status;
    await ambulance.save();

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      data: {
        availabilityStatus: status
      }
    });

  } catch (error) {
    console.error('Update ambulance status error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const Accident = require('../models/Accident');

exports.getEmergencies = async (req, res) => {
  try {
    const emergencies = await Accident.find({
      assignedAmbulance: req.user.userId,
      ambulanceAlertStatus: { $in: ['SENT', 'ACCEPTED'] }
    }).sort({ createdAt: -1 });

    // Format them similar to the socket payload
    const formatted = emergencies.map(acc => ({
      accidentId: acc._id,
      accidentType: acc.accidentType,
      userSeverity: acc.severity,
      description: acc.description,
      latitude: acc.latitude,
      longitude: acc.longitude,
      distanceKm: acc.ambulanceAssignmentDistanceKm,
      status: acc.status,
      aiAnalysis: acc.aiAnalysis,
      imageUrl: acc.imagePath,
      createdAt: acc.createdAt,
      ambulanceAlertStatus: acc.ambulanceAlertStatus
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Get emergencies error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.acceptEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    
    const accident = await Accident.findById(id);
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    if (accident.assignedAmbulance.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: Emergency not assigned to this ambulance' });
    }

    if (accident.ambulanceAlertStatus !== 'SENT') {
      return res.status(400).json({ success: false, message: 'Emergency has already been accepted or is no longer valid' });
    }

    accident.ambulanceAlertStatus = 'ACCEPTED';
    await accident.save();

    // Set ambulance to BUSY
    await User.findByIdAndUpdate(req.user.userId, { availabilityStatus: 'BUSY' });

    res.json({ success: true, message: 'Emergency accepted' });
  } catch (error) {
    console.error('Accept emergency error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.declineEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    
    const accident = await Accident.findById(id);
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    if (accident.assignedAmbulance.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: Emergency not assigned to this ambulance' });
    }

    if (accident.ambulanceAlertStatus !== 'SENT') {
      return res.status(400).json({ success: false, message: 'Emergency has already been processed' });
    }

    accident.ambulanceAlertStatus = 'DECLINED';
    await accident.save();

    res.json({ success: true, message: 'Emergency declined' });
  } catch (error) {
    console.error('Decline emergency error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.completeEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    
    const accident = await Accident.findById(id);
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    if (accident.assignedAmbulance.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: Emergency not assigned to this ambulance' });
    }

    if (accident.ambulanceAlertStatus !== 'ACCEPTED') {
      return res.status(400).json({ success: false, message: 'Only ACCEPTED emergencies can be completed' });
    }

    accident.ambulanceAlertStatus = 'COMPLETED';
    accident.completedAt = new Date();
    await accident.save();

    // Set ambulance back to AVAILABLE
    await User.findByIdAndUpdate(req.user.userId, { availabilityStatus: 'AVAILABLE' });

    res.json({ success: true, message: 'Emergency completed successfully' });
  } catch (error) {
    console.error('Complete emergency error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getEmergencyHistory = async (req, res) => {
  try {
    const emergencies = await Accident.find({
      assignedAmbulance: req.user.userId,
      ambulanceAlertStatus: 'COMPLETED'
    })
    .sort({ completedAt: -1 })
    .limit(20);

    const formatted = emergencies.map(acc => ({
      _id: acc._id,
      accidentType: acc.accidentType,
      latitude: acc.latitude,
      longitude: acc.longitude,
      aiAnalysis: acc.aiAnalysis,
      imageUrl: acc.imagePath,
      ambulanceAlertStatus: acc.ambulanceAlertStatus,
      createdAt: acc.createdAt,
      completedAt: acc.completedAt
    }));

    res.json({
      success: true,
      emergencies: formatted
    });
  } catch (error) {
    console.error('Get emergency history error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Toggle Live Mode for the authenticated ambulance
 * Starts/stops continuous broadcasting of 350m lane-clear emergency alerts
 */
exports.toggleLiveMode = async (req, res) => {
  try {
    if (req.user.role !== 'AMBULANCE') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only ambulances can toggle live mode' });
    }

    const { isLive, latitude, longitude, speed, heading } = req.body;
    const socketManager = require('../sockets/socketManager');

    const result = await socketManager.handleAmbulanceLiveMode(
      req.user.userId,
      isLive,
      latitude,
      longitude,
      speed,
      heading
    );

    res.json(result);
  } catch (error) {
    console.error('Toggle live mode error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Update current GPS coordinates and broadcast live proximity to nearby users
 */
exports.updateLiveLocation = async (req, res) => {
  try {
    if (req.user.role !== 'AMBULANCE') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only ambulances can update live location' });
    }

    const { latitude, longitude, speed, heading } = req.body;
    const socketManager = require('../sockets/socketManager');

    const result = await socketManager.handleAmbulanceLocationUpdate(
      req.user.userId,
      latitude,
      longitude,
      speed,
      heading
    );

    res.json(result);
  } catch (error) {
    console.error('Update live location error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Fetch current live status and active location
 */
exports.getLiveStatus = async (req, res) => {
  try {
    const ambulance = await User.findById(req.user.userId);
    if (!ambulance) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }

    res.json({
      success: true,
      data: {
        isLiveMode: Boolean(ambulance.isLiveMode),
        latitude: ambulance.latitude,
        longitude: ambulance.longitude,
        liveSpeed: ambulance.liveSpeed || 0,
        liveHeading: ambulance.liveHeading || 0,
        availabilityStatus: ambulance.availabilityStatus,
        ambulanceName: ambulance.ambulanceName,
        vehicleNumber: ambulance.vehicleNumber
      }
    });
  } catch (error) {
    console.error('Get live status error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

