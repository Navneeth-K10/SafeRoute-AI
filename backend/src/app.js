const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();

// Serve frontend static files
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());

// Basic health endpoint
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateIndex = mongoose.connection.readyState;
  res.json({
    success: true,
    message: "SafeRoute is running",
    database: {
      status: states[stateIndex] || 'unknown',
      readyState: stateIndex,
      name: mongoose.connection.name || 'saferoute'
    },
    timestamp: new Date().toISOString()
  });
});



// Routes
const authRoutes = require('./routes/authRoutes');
const accidentRoutes = require('./routes/accidentRoutes');
const ambulanceRoutes = require('./routes/ambulanceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hotspotRoutes = require('./routes/hotspotRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/accidents', accidentRoutes);
app.use('/api/ambulance', ambulanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hotspots', hotspotRoutes);

// Expose uploads directory publicly
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

module.exports = app;
