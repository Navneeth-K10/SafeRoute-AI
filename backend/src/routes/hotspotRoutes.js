const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Hotspot = require('../models/Hotspot');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const hotspots = await Hotspot.find().select('-__v -verifiedAccidentIds');
    
    res.json({
      success: true,
      data: hotspots
    });
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    res.status(500).json({ success: false, message: 'Server error fetching hotspots' });
  }
});

module.exports = router;
