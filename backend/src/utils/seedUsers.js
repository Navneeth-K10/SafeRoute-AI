require('dotenv').config({ path: '../../.env' }); // load from backend/.env
const mongoose = require('mongoose');
const User = require('../models/User');

const seedUsers = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saferoute';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const usersToSeed = [
      {
        name: 'Normal User',
        email: 'user@saferoute.com',
        password: 'password123',
        phone: '1111111111',
        role: 'USER'
      },
      {
        name: 'Police Officer',
        email: 'police@saferoute.com',
        password: 'password123',
        phone: '2222222222',
        role: 'POLICE'
      },
      {
        name: 'Ambulance Driver',
        email: 'ambulance@saferoute.com',
        password: 'password123',
        phone: '3333333333',
        role: 'AMBULANCE'
      },
      {
        name: 'System Admin',
        email: 'admin@saferoute.com',
        password: 'password123',
        phone: '4444444444',
        role: 'ADMIN'
      }
    ];

    for (const userData of usersToSeed) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`Seeded user: ${userData.role} (${userData.email})`);
      } else {
        console.log(`User already exists: ${userData.role} (${userData.email})`);
      }
    }

    console.log('Database seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedUsers();
