const fs = require('fs');

async function runTests() {
  const API_URL = 'http://localhost:3000/api';
  let token = '';

  const testUser = {
    name: 'New User',
    email: 'newuser@example.com',
    password: 'password123',
    phone: '5555555555'
  };

  console.log('--- TEST 1: Register new USER ---');
  let res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });
  let data = await res.json();
  console.log('Status:', res.status, 'Response:', JSON.stringify(data));

  console.log('\n--- TEST 2: Register same email ---');
  res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });
  data = await res.json();
  console.log('Status:', res.status, 'Response:', JSON.stringify(data));

  console.log('\n--- TEST 3: Login with correct password ---');
  res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email, password: testUser.password })
  });
  data = await res.json();
  console.log('Status:', res.status, 'Response:', JSON.stringify(data));
  if (data.success) {
    token = data.data.token;
  }

  console.log('\n--- TEST 4: Login with wrong password ---');
  res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email, password: 'wrongpassword' })
  });
  data = await res.json();
  console.log('Status:', res.status, 'Response:', JSON.stringify(data));

  console.log('\n--- TEST 5: GET /auth/me with valid token ---');
  res = await fetch(`${API_URL}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  data = await res.json();
  console.log('Status:', res.status, 'Response:', JSON.stringify(data));

  console.log('\n--- TEST 6: GET /auth/me without token ---');
  res = await fetch(`${API_URL}/auth/me`);
  data = await res.json();
  console.log('Status:', res.status, 'Response:', JSON.stringify(data));

  console.log('\n--- TESTING SEEDED ACCOUNTS ---');
  for (const role of ['police', 'ambulance', 'admin']) {
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${role}@saferoute.com`, password: 'password123' })
    });
    data = await res.json();
    console.log(`Login as ${role}: Status ${res.status}, role: ${data.data?.user?.role}`);
  }
}

runTests();
