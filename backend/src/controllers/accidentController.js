const Accident = require('../models/Accident');
const User = require('../models/User');
const aiService = require('../services/ai/aiService');
const { calculateDistanceKm } = require('../utils/distance');

exports.createAccident = async (req, res) => {
  try {
    const { accidentType, severity, description, latitude, longitude } = req.body;

    // Validate request
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    if (!accidentType || !severity || !description || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, message: 'Invalid latitude' });
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Invalid longitude' });
    }
    
    const validSeverities = ['Minor', 'Moderate', 'Severe'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({ success: false, message: 'Invalid severity' });
    }

    // Find all approved police stations with coordinates
    const policeStations = await User.find({
      role: 'POLICE',
      approvalStatus: 'APPROVED',
      latitude: { $ne: null },
      longitude: { $ne: null }
    });

    let assignedStationId = null;
    let minDistance = null;

    if (policeStations.length > 0) {
      // Find nearest station
      for (const station of policeStations) {
        const dist = calculateDistanceKm(lat, lng, station.latitude, station.longitude);
        if (minDistance === null || dist < minDistance) {
          minDistance = dist;
          assignedStationId = station._id;
        }
      }
    }

    // Create accident document
    const newAccident = new Accident({
      reportedBy: req.user.userId, // Set securely from JWT payload { userId, role }
      accidentType,
      severity,
      description,
      latitude: lat,
      longitude: lng,
      imagePath: `/uploads/accidents/${req.file.filename}`,
      status: 'PENDING',
      assignedPoliceStation: assignedStationId,
      assignmentDistanceKm: minDistance
    });

    await newAccident.save();

    // Process AI analysis immediately
    // If AI fails, it will catch internally, return null, and not break the submission
    const aiAnalysisResult = await aiService.processAccident(newAccident._id);

    // ============================================
    // AMBULANCE EMERGENCY ASSIGNMENT LOGIC
    // ============================================
    console.log(`[EMERGENCY] Accident created: ${newAccident._id}`);
    console.log(`[EMERGENCY] Gemini result: detected = ${aiAnalysisResult ? aiAnalysisResult.detected : false}`);
    
    if (aiAnalysisResult && aiAnalysisResult.detected === true) {
      console.log(`[EMERGENCY] Searching for available ambulances...`);
      
      const availableAmbulances = await User.find({
        role: 'AMBULANCE',
        approvalStatus: 'APPROVED',
        availabilityStatus: 'AVAILABLE',
        latitude: { $ne: null },
        longitude: { $ne: null }
      });
      
      console.log(`[EMERGENCY] Available ambulance count: ${availableAmbulances.length}`);

      let ambulanceAssigned = null;
      let minAmbulanceDistance = null;

      if (availableAmbulances.length > 0) {
        for (const amb of availableAmbulances) {
          const dist = calculateDistanceKm(lat, lng, amb.latitude, amb.longitude);
          console.log(`[EMERGENCY] Ambulance: ${amb._id} ${amb.ambulanceName} ${amb.latitude},${amb.longitude} ${amb.availabilityStatus}`);
          console.log(`[EMERGENCY] Distance to ambulance ${amb._id}: ${dist} km`);
          
          if (minAmbulanceDistance === null || dist < minAmbulanceDistance) {
            minAmbulanceDistance = dist;
            ambulanceAssigned = amb._id;
          }
        }
      }

      if (ambulanceAssigned) {
        console.log(`[EMERGENCY] Selected ambulance: ${ambulanceAssigned}`);
        console.log(`[EMERGENCY] Distance: ${minAmbulanceDistance} km`);
        console.log(`[EMERGENCY] Assignment saved`);
        
        await Accident.updateOne(
          { _id: newAccident._id },
          {
            assignedAmbulance: ambulanceAssigned,
            ambulanceAssignmentDistanceKm: minAmbulanceDistance,
            ambulanceAlertStatus: 'SENT'
          }
        );

        newAccident.assignedAmbulance = ambulanceAssigned;
        newAccident.ambulanceAssignmentDistanceKm = minAmbulanceDistance;
        newAccident.ambulanceAlertStatus = 'SENT';

        try {
          const socketManager = require('../sockets/socketManager');
          const io = socketManager.getIo();
          
          console.log(`[EMERGENCY] Emitting accident:emergency`);
          console.log(`[SOCKET] Target: ambulance:${ambulanceAssigned}`);
          
          io.to(`ambulance:${ambulanceAssigned}`).emit('accident:emergency', {
            accidentId: newAccident._id,
            accidentType: newAccident.accidentType,
            userSeverity: newAccident.severity,
            description: newAccident.description,
            latitude: newAccident.latitude,
            longitude: newAccident.longitude,
            distanceKm: minAmbulanceDistance,
            status: newAccident.status,
            aiAnalysis: aiAnalysisResult,
            imageUrl: newAccident.imagePath,
            createdAt: newAccident.createdAt
          });
        } catch (err) {
          console.error('Ambulance Socket emission error:', err);
        }
      } else {
        await Accident.updateOne(
          { _id: newAccident._id },
          { ambulanceAlertStatus: 'NO_AMBULANCE_AVAILABLE' }
        );
        newAccident.ambulanceAlertStatus = 'NO_AMBULANCE_AVAILABLE';
        console.log(`[EMERGENCY] No ambulance available`);
      }
    }
    // ============================================
    
    if (assignedStationId) {
      try {
        const socketManager = require('../sockets/socketManager');
        const io = socketManager.getIo();
        
        io.to(`police:${assignedStationId}`).emit('accident:new', {
          _id: newAccident._id,
          accidentType: newAccident.accidentType,
          severity: newAccident.severity,
          latitude: newAccident.latitude,
          longitude: newAccident.longitude,
          description: newAccident.description,
          status: newAccident.status,
          imagePath: newAccident.imagePath,
          assignmentDistanceKm: newAccident.assignmentDistanceKm,
          createdAt: newAccident.createdAt,
          aiAnalysis: aiAnalysisResult || undefined
        });
      } catch (err) {
        console.error('Socket emission error:', err);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Accident report submitted successfully',
      data: {
        id: newAccident._id,
        status: newAccident.status,
        reportedBy: newAccident.reportedBy,
        aiAnalysis: aiAnalysisResult,
        assignedPoliceStation: newAccident.assignedPoliceStation,
        assignmentDistanceKm: newAccident.assignmentDistanceKm
      }
    });

  } catch (error) {
    console.error('Create accident error:', error);
    res.status(500).json({ success: false, message: 'Server error during submission' });
  }
};

exports.getMyAccidents = async (req, res) => {
  try {
    const accidents = await Accident.find({ reportedBy: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: accidents
    });
  } catch (error) {
    console.error('Get my accidents error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching reports' });
  }
};

exports.getPendingAccidents = async (req, res) => {
  try {
    const query = { status: 'PENDING' };
    
    // If user is POLICE, restrict to assigned station
    if (req.user.role === 'POLICE') {
      query.assignedPoliceStation = req.user.userId;
    }

    const accidents = await Accident.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: accidents
    });
  } catch (error) {
    console.error('Get pending accidents error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching pending reports' });
  }
};

exports.updateAccidentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const accident = await Accident.findById(id);

    if (!accident) {
      return res.status(404).json({ success: false, message: 'Accident not found' });
    }

    // Security: Only the assigned police station can verify/reject
    if (req.user.role === 'POLICE' && accident.assignedPoliceStation) {
      if (accident.assignedPoliceStation.toString() !== req.user.userId.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: Accident assigned to another station' });
      }
    }

    if (accident.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Only PENDING accidents can be updated' });
    }

    accident.status = status;
    accident.verifiedBy = req.user.userId;
    await accident.save();
    
    // Non-blocking hotspot trigger
    if (status === 'VERIFIED') {
      const hotspotService = require('../services/hotspot/hotspotService');
      hotspotService.processVerifiedAccident(accident._id).catch(err => {
        console.error('[HOTSPOT ENGINE] Non-fatal error during async processing:', err);
      });
    }

    res.json({
      success: true,
      message: `Accident successfully ${status}`,
      data: accident
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Server error updating status' });
  }
};
