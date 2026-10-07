const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saferoute');
  const User = require('./src/models/User');

  console.log('--- TEST A: LOGIN APPROVED POLICE ---');
  let police = await User.findOne({ role: 'POLICE', approvalStatus: 'APPROVED' });
  if (!police) {
    console.log('No approved police found, trying to approve one...');
    police = await User.findOne({ role: 'POLICE' });
    if (police) {
      police.approvalStatus = 'APPROVED';
      await police.save();
    }
  }

  if (police) {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: police.email, password: 'password123' })
    });
    const data = await res.json();
    console.log('Login Approved Police Result:', res.status, data.message);

    // Test API
    const authRes = await fetch('http://localhost:3000/api/auth/me', {
      headers: { 'Authorization': `Bearer ${data.data?.token || ''}` }
    });
    console.log('API Request Approved Police:', authRes.status, (await authRes.json()).message);
  }

  console.log('\n--- TEST B: LOGIN PENDING POLICE ---');
  let pendingPolice = new User({
    name: 'Pending Station', stationName: 'Pending Station', email: `pending${Date.now()}@police.com`,
    password: 'password123', phone: '1234567890', address: '123 Pending St', city: 'City', district: 'District', state: 'State',
    latitude: 10, longitude: 10, role: 'POLICE', approvalStatus: 'PENDING'
  });
  await pendingPolice.save();
  
  const pendingRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: pendingPolice.email, password: 'password123' })
  });
  console.log('Login Pending Police Result:', pendingRes.status, (await pendingRes.json()).message);

  console.log('\n--- TEST C: LOGIN REJECTED POLICE ---');
  pendingPolice.approvalStatus = 'REJECTED';
  await pendingPolice.save();

  const rejectedRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: pendingPolice.email, password: 'password123' })
  });
  console.log('Login Rejected Police Result:', rejectedRes.status, (await rejectedRes.json()).message);

  console.log('\n--- TEST F: EXISTING LOGGED-IN POLICE REJECTED MID-SESSION ---');
  pendingPolice.approvalStatus = 'APPROVED';
  await pendingPolice.save();

  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: pendingPolice.email, password: 'password123' })
  });
  const token = (await loginRes.json()).data.token;
  
  // Now reject the account
  pendingPolice.approvalStatus = 'REJECTED';
  await pendingPolice.save();

  // Try API Request
  const midSessionRes = await fetch('http://localhost:3000/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('API Request Mid-Session Rejected:', midSessionRes.status, (await midSessionRes.json()).message);

  console.log('\n--- TEST G: NORMAL USER LOGIN ---');
  const user = await User.findOne({ role: 'USER' });
  if (user) {
    const userRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'password123' })
    });
    console.log('User Login Result:', userRes.status, (await userRes.json()).message);
  }

  process.exit(0);
}

run();
