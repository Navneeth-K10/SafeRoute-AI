const express = require('express');
const router = express.Router();
const ambulanceController = require('../controllers/ambulanceController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Protect all ambulance routes
router.use(authMiddleware);
router.use(roleMiddleware('AMBULANCE'));

router.patch('/location', ambulanceController.updateLocation);
router.patch('/status', ambulanceController.updateStatus);

// Ambulance Live Mode (Emergency Transit & 350m Lane-Clear Alerts)
router.patch('/live-mode', ambulanceController.toggleLiveMode);
router.patch('/live-location', ambulanceController.updateLiveLocation);
router.get('/live-status', ambulanceController.getLiveStatus);

router.get('/emergencies', ambulanceController.getEmergencies);
router.get('/emergencies/history', ambulanceController.getEmergencyHistory);
router.patch('/emergencies/:id/accept', ambulanceController.acceptEmergency);
router.patch('/emergencies/:id/decline', ambulanceController.declineEmergency);
router.patch('/emergencies/:id/complete', ambulanceController.completeEmergency);

module.exports = router;

