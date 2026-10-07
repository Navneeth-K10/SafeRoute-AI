const express = require('express');
const router = express.Router();
const accidentController = require('../controllers/accidentController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Add role middleware dynamically
const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
};

router.post(
  '/',
  authMiddleware,
  roleMiddleware(['USER']),
  upload.single('image'),
  accidentController.createAccident
);

router.get(
  '/my',
  authMiddleware,
  roleMiddleware(['USER']),
  accidentController.getMyAccidents
);

router.get(
  '/pending',
  authMiddleware,
  roleMiddleware(['POLICE', 'ADMIN']),
  accidentController.getPendingAccidents
);

router.patch(
  '/:id/status',
  authMiddleware,
  roleMiddleware(['POLICE']),
  accidentController.updateAccidentStatus
);

// Handle multer errors specifically
router.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.message });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

module.exports = router;
