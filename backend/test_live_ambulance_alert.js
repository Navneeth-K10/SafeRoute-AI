const mongoose = require('mongoose');
const { io } = require('socket.io-client');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

async function runTest() {
  console.log('====================================================');
  console.log('🧪 TESTING AMBULANCE LIVE MODE & 350M CLEAR LANE ALERT');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saferoute');
  const User = require('./src/models/User');

  const timestamp = Date.now();
  const userEmail = `user_lane_${timestamp}@test.com`;
  const ambEmail = `amb_lane_${timestamp}@test.com`;
  const vehicleNo = `KL-07-LANE-${timestamp.toString().slice(-4)}`;

  // Base coordinates (e.g., Bangalore MG Road)
  // 1 degree latitude ~= 111,000 meters. 0.001 deg ~= 111 meters.
  const baseLat = 12.971600;
  const baseLng = 77.594600;

  // 1. Register & Login User
  console.log('1️⃣ Registering and logging in User...');
  let res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Motorist',
      email: userEmail,
      password: 'password123',
      phone: '9876543210'
    })
  });
  let data = await res.json();
  if (!data.success) throw new Error('User registration failed: ' + data.message);

  res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, password: 'password123' })
  });
  data = await res.json();
  const userToken = data.data.token;
  console.log('   ✅ User logged in successfully. User ID:', data.data.user.id);

  // 2. Register, Approve & Login Ambulance
  console.log('\n2️⃣ Registering, approving, and logging in Ambulance...');
  res = await fetch(`${API_URL}/auth/register-ambulance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ambulanceName: 'Rapid Trauma Unit 108',
      vehicleNumber: vehicleNo,
      driverName: 'Officer Davis',
      email: ambEmail,
      phone: '9123456780',
      address: 'City Central Trauma Center',
      city: 'Kochi',
      district: 'Ernakulam',
      state: 'Kerala',
      latitude: baseLat + 0.01,
      longitude: baseLng,
      password: 'password123'
    })
  });
  data = await res.json();
  if (!data.success) throw new Error('Ambulance registration failed: ' + data.message);

  // Auto-approve ambulance in DB
  await User.findOneAndUpdate({ email: ambEmail }, { approvalStatus: 'APPROVED' });

  res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ambEmail, password: 'password123' })
  });
  data = await res.json();
  const ambToken = data.data.token;
  console.log('   ✅ Ambulance approved and logged in. Vehicle:', vehicleNo);

  // 3. Connect User Socket and set user location
  console.log('\n3️⃣ Connecting User socket and reporting location...');
  const userSocket = io(SOCKET_URL, { auth: { token: userToken } });

  await new Promise((resolve) => {
    userSocket.on('connect', () => {
      console.log('   ✅ User socket connected:', userSocket.id);
      userSocket.emit('user:location', { latitude: baseLat, longitude: baseLng }, (ack) => {
        console.log('   📍 User location registered:', baseLat, baseLng);
        resolve();
      });
    });
  });

  // Track alerts received by User
  const receivedAlerts = [];
  const receivedClearances = [];

  userSocket.on('ambulance:clear_lane_alert', (alert) => {
    console.log(`   🚨 [USER EVENT] ambulance:clear_lane_alert! Distance: ${alert.distanceMeters}m | Vehicle: ${alert.vehicleNumber}`);
    receivedAlerts.push(alert);
  });

  userSocket.on('ambulance:clear_lane_cleared', (cleared) => {
    console.log(`   ✅ [USER EVENT] ambulance:clear_lane_cleared! Msg: ${cleared.message}`);
    receivedClearances.push(cleared);
  });

  // 4. Connect Ambulance Socket
  console.log('\n4️⃣ Connecting Ambulance socket...');
  const ambSocket = io(SOCKET_URL, { auth: { token: ambToken } });
  await new Promise((resolve) => {
    ambSocket.on('connect', () => {
      console.log('   ✅ Ambulance socket connected:', ambSocket.id);
      resolve();
    });
  });

  // 5. Test Step A: Ambulance activates Live Mode at distance > 350m (approx 1000m away)
  console.log('\n5️⃣ STEP A: Ambulance starts Live Mode at 1,000m away (Outside 350m radius)...');
  const farLat = baseLat + 0.009; // ~1000m away
  await new Promise((resolve) => {
    ambSocket.emit('ambulance:toggle_live_mode', {
      isLive: true,
      latitude: farLat,
      longitude: baseLng
    }, (ack) => {
      console.log('   📡 Ambulance Live Mode activated. Server response:', ack);
      resolve();
    });
  });

  await new Promise(r => setTimeout(r, 600));
  if (receivedAlerts.length === 0) {
    console.log('   ✅ PASS: User did NOT receive alert at 1000m distance (as expected).');
  } else {
    throw new Error('FAIL: User incorrectly received alert outside 350m!');
  }

  // 6. Test Step B: Ambulance moves into the 350m lane zone (approx 200m away)
  console.log('\n6️⃣ STEP B: Ambulance moves within 200m of the user (Inside 350m radius)...');
  const nearLat = baseLat + 0.0018; // ~200m away
  await new Promise((resolve) => {
    ambSocket.emit('ambulance:live_location', {
      latitude: nearLat,
      longitude: baseLng,
      speed: 60,
      heading: 180
    }, (ack) => {
      console.log('   📡 Ambulance location update acknowledged. Server ack:', ack);
      resolve();
    });
  });

  await new Promise(r => setTimeout(r, 800));
  if (receivedAlerts.length > 0) {
    const lastAlert = receivedAlerts[receivedAlerts.length - 1];
    console.log(`   ✅ PASS: User RECEIVED CLEAR LANE ALERT!`);
    console.log(`      - Distance: ${lastAlert.distanceMeters}m (Threshold: ${lastAlert.radiusThreshold}m)`);
    console.log(`      - Message: "${lastAlert.message}"`);
    console.log(`      - Vehicle: ${lastAlert.vehicleNumber}`);
    if (lastAlert.distanceMeters > 350) {
      throw new Error(`FAIL: Alert distance ${lastAlert.distanceMeters}m exceeds 350m threshold!`);
    }
  } else {
    throw new Error('FAIL: User did not receive clear-lane alert when within 200m!');
  }

  // 7. Test Step C: Ambulance moves past user to 600m away (Beyond 350m radius)
  console.log('\n7️⃣ STEP C: Ambulance moves past user to 600m away (Leaving 350m radius)...');
  const awayLat = baseLat - 0.0055; // ~610m away
  await new Promise((resolve) => {
    ambSocket.emit('ambulance:live_location', {
      latitude: awayLat,
      longitude: baseLng,
      speed: 55,
      heading: 180
    }, (ack) => {
      resolve();
    });
  });

  await new Promise(r => setTimeout(r, 800));
  if (receivedClearances.length > 0) {
    console.log(`   ✅ PASS: User RECEIVED CLEARANCE NOTIFICATION! (Ambulance has passed beyond 350m).`);
  } else {
    throw new Error('FAIL: User was not notified when ambulance moved beyond 350m!');
  }

  // 8. Test Step D: Ambulance moves back inside 350m, then turns OFF Live Mode
  console.log('\n8️⃣ STEP D: Ambulance enters 350m again, then turns OFF Live Mode...');
  const insideAgainLat = baseLat + 0.001; // ~110m away
  await new Promise((resolve) => {
    ambSocket.emit('ambulance:live_location', {
      latitude: insideAgainLat,
      longitude: baseLng,
      speed: 40,
      heading: 90
    }, () => resolve());
  });

  await new Promise(r => setTimeout(r, 600));
  const alertsBeforeStop = receivedAlerts.length;
  console.log(`   - Alerts count before turning off: ${alertsBeforeStop}`);

  // Now turn off live mode
  const clearancesBeforeStop = receivedClearances.length;
  await new Promise((resolve) => {
    ambSocket.emit('ambulance:toggle_live_mode', { isLive: false }, () => resolve());
  });

  await new Promise(r => setTimeout(r, 800));
  if (receivedClearances.length > clearancesBeforeStop) {
    console.log(`   ✅ PASS: When Live Mode turned OFF, user was automatically notified and alert was cleared.`);
  } else {
    throw new Error('FAIL: Turning off Live Mode did not clear user alert!');
  }

  // 9. Test REST Endpoints
  console.log('\n9️⃣ STEP E: Testing REST endpoints (/api/ambulance/live-mode, /api/ambulance/live-status)...');
  const restToggleRes = await fetch(`${API_URL}/ambulance/live-mode`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ambToken}`
    },
    body: JSON.stringify({ isLive: true, latitude: baseLat, longitude: baseLng })
  });
  const restToggleData = await restToggleRes.json();
  console.log('   - REST Toggle Live Mode:', restToggleRes.status, restToggleData);

  const restStatusRes = await fetch(`${API_URL}/ambulance/live-status`, {
    headers: { 'Authorization': `Bearer ${ambToken}` }
  });
  const restStatusData = await restStatusRes.json();
  console.log('   - REST Live Status:', restStatusRes.status, restStatusData);

  if (restStatusData.data.isLiveMode === true) {
    console.log('   ✅ PASS: REST endpoints successfully reflect live mode status!');
  } else {
    throw new Error('FAIL: REST endpoint did not reflect active live mode!');
  }

  // Cleanup
  userSocket.disconnect();
  ambSocket.disconnect();
  await mongoose.disconnect();

  console.log('\n====================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
  console.log('====================================================\n');
}

runTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
