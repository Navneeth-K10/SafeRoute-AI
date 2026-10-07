const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/register-police', authController.registerPolice);
router.post('/register-ambulance', authController.registerAmbulance);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getCurrentUser);
router.patch('/location', authMiddleware, authController.updateLocation);

module.exports = router;

