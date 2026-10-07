async function testAmbulance() {
  const API_URL = 'http://localhost:3000/api';
  const testEmail = `ambulance_${Date.now()}@test.org`;
  const vehicle = `KL-01-${Date.now()}`;

  console.log('--- TEST 1: REGISTER AMBULANCE ---');
  let res = await fetch(`${API_URL}/auth/register-ambulance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ambulanceName: 'Rapid Response Unit',
      vehicleNumber: vehicle,
      driverName: 'John Doe',
      email: testEmail,
      phone: '9999999999',
      address: 'General Hospital',
      city: 'Adoor',
      district: 'Pathanamthitta',
      state: 'Kerala',
      latitude: 9.15,
      longitude: 76.7,
      password: 'password123'
    })
  });
  
  let data = await res.json();
  console.log('Register Response:', data);
  if (!data.success) throw new Error('Registration failed');

  console.log('\n--- TEST 2: LOGIN AMBULANCE ---');
  res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'password123' })
  });
  data = await res.json();
  console.log('Login Response:', data);
  const token = data.data.token;

  console.log('\n--- TEST 3: UPDATE STATUS ---');
  res = await fetch(`${API_URL}/ambulance/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status: 'OFFLINE' })
  });
  data = await res.json();
  console.log('Status Update Response:', data);

  console.log('\n--- TEST 4: UPDATE LOCATION ---');
  res = await fetch(`${API_URL}/ambulance/location`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ latitude: 9.16, longitude: 76.71 })
  });
  data = await res.json();
  console.log('Location Update Response:', data);
  
  console.log('\n--- TEST 5: GET CURRENT USER ---');
  res = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  data = await res.json();
  console.log('Me Response:', data.data.user);
}

testAmbulance().catch(console.error);
