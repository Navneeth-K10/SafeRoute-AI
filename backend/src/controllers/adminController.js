const User = require('../models/User');
const Accident = require('../models/Accident');

exports.getStats = async (req, res) => {
  try {
    const usersCount = await User.countDocuments({ role: 'USER' });
    const policeCount = await User.countDocuments({ role: 'POLICE' });
    const ambulanceCount = await User.countDocuments({ role: 'AMBULANCE' });
    
    const accidentsCount = await Accident.countDocuments();
    const activeEmergenciesCount = await Accident.countDocuments({ 
      ambulanceAlertStatus: { $in: ['SENT', 'ACCEPTED'] } 
    });
    const completedEmergenciesCount = await Accident.countDocuments({ 
      ambulanceAlertStatus: 'COMPLETED' 
    });

    res.json({
      success: true,
      data: {
        users: usersCount,
        policeStations: policeCount,
        ambulances: ambulanceCount,
        accidents: accidentsCount,
        activeEmergencies: activeEmergenciesCount,
        completedEmergencies: completedEmergenciesCount
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const role = req.query.role;
    const query = role ? { role } : {};
    
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ success: false, message: 'Failed to load users' });
  }
};

exports.getAccidents = async (req, res) => {
  try {
    const type = req.query.type;
    let query = {};
    
    if (type === 'active') {
      query = { ambulanceAlertStatus: { $in: ['SENT', 'ACCEPTED'] } };
    } else if (type === 'completed') {
      query = { ambulanceAlertStatus: 'COMPLETED' };
    }
    
    const accidents = await Accident.find(query)
      .populate('reportedBy', 'name phone')
      .populate('assignedAmbulance', 'ambulanceName vehicleNumber')
      .populate('assignedPoliceStation', 'stationName')
      .sort({ createdAt: -1 });
      
    res.json({
      success: true,
      data: accidents
    });
  } catch (error) {
    console.error('Admin accidents error:', error);
    res.status(500).json({ success: false, message: 'Failed to load accidents' });
  }
};

exports.updateApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.approvalStatus = status;
    await user.save();
    
    res.json({
      success: true,
      message: `Approval status updated to ${status}`,
      data: {
        id: user._id,
        approvalStatus: user.approvalStatus
      }
    });
  } catch (error) {
    console.error('Admin approval error:', error);
    res.status(500).json({ success: false, message: 'Failed to update approval status' });
  }
};
