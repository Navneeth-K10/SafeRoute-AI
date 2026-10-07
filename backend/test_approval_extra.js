const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saferoute');
  const User = require('./src/models/User');

  console.log('\n--- TEST D/E: AMBULANCE APPROVAL / REJECTION ---');
  let amb = await User.findOne({ role: 'AMBULANCE' });
  if (amb) {
    amb.approvalStatus = 'PENDING';
    await amb.save();
    let res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: amb.email, password: 'password123' })
    });
    console.log('Pending Ambulance Login:', res.status, (await res.json()).message);
    
    amb.approvalStatus = 'REJECTED';
    await amb.save();
    res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: amb.email, password: 'password123' })
    });
    console.log('Rejected Ambulance Login:', res.status, (await res.json()).message);

    amb.approvalStatus = 'APPROVED';
    await amb.save();
    res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: amb.email, password: 'password123' })
    });
    console.log('Approved Ambulance Login:', res.status, (await res.json()).message);
  }

  console.log('\n--- TEST H: ADMIN LOGIN ---');
  const admin = await User.findOne({ role: 'ADMIN' });
  if (admin) {
    const adminRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: admin.email, password: 'admin123' })
    });
    console.log('Admin Login Result:', adminRes.status, (await adminRes.json()).message);
  }

  process.exit(0);
}

run();
