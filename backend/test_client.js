const io = require('socket.io-client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create a dummy JWT token for AMBULANCE
const token = jwt.sign({ userId: '6ab7797c49eeab43bada7796', role: 'AMBULANCE' }, process.env.JWT_SECRET || 'fallback_secret');

console.log('Connecting with token:', token);

const socket = io('http://localhost:3000', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('Socket connected successfully! ID:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err.message);
});

socket.on('accident:emergency', (payload) => {
  console.log('RECEIVED accident:emergency!!!');
  console.log(payload);
});
