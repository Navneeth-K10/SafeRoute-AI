const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

let embeddedMongoServer = null;

/**
 * Seed initial administrative, police, ambulance, and demo users if empty
 */
async function seedDefaultData() {
  try {
    const User = require('../models/User');
    const Hotspot = require('../models/Hotspot');

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Database] Database is empty. Seeding initial accounts...');
      
      const defaultUsers = [
        {
          name: 'System Admin',
          email: 'admin@saferoute.com',
          password: 'password123',
          phone: '9999999999',
          role: 'ADMIN',
          isActive: true
        },
        {
          name: 'Central Police Station',
          stationName: 'Central Police Station',
          stationCode: 'CPS-101',
          email: 'police@saferoute.com',
          password: 'password123',
          phone: '9888888888',
          address: 'MG Road Police Station, Bengaluru',
          city: 'Bengaluru',
          district: 'Bengaluru Urban',
          state: 'Karnataka',
          latitude: 12.9716,
          longitude: 77.5946,
          role: 'POLICE',
          approvalStatus: 'APPROVED',
          isActive: true
        },
        {
          name: 'Emergency Ambulance 01',
          ambulanceName: 'Rapid Response Care 01',
          vehicleNumber: 'KA-01-EQ-9999',
          driverName: 'Suresh Kumar',
          email: 'ambulance@saferoute.com',
          password: 'password123',
          phone: '9777777777',
          address: 'Victoria Hospital Emergency Bay',
          city: 'Bengaluru',
          district: 'Bengaluru Urban',
          state: 'Karnataka',
          latitude: 12.9620,
          longitude: 77.5750,
          role: 'AMBULANCE',
          approvalStatus: 'APPROVED',
          availabilityStatus: 'AVAILABLE',
          isActive: true
        },
        {
          name: 'Citizen Demo User',
          email: 'user@saferoute.com',
          password: 'password123',
          phone: '9666666666',
          role: 'USER',
          isActive: true
        }
      ];

      for (const u of defaultUsers) {
        const newUser = new User(u);
        await newUser.save();
        console.log(`[Database] Seeded ${u.role}: ${u.email}`);
      }
    }

    const hotspotCount = await Hotspot.countDocuments();
    if (hotspotCount === 0) {
      console.log('[Database] Seeding initial sample accident hotspots...');
      const sampleHotspots = [
        {
          centerLatitude: 12.9760,
          centerLongitude: 77.5900,
          accidentCount: 8,
          riskLevel: 'HIGH',
          riskScore: 78,
          radius: 400
        },
        {
          centerLatitude: 12.9352,
          centerLongitude: 77.6245,
          accidentCount: 14,
          riskLevel: 'CRITICAL',
          riskScore: 92,
          radius: 500
        },
        {
          centerLatitude: 12.9850,
          centerLongitude: 77.6400,
          accidentCount: 4,
          riskLevel: 'MODERATE',
          riskScore: 45,
          radius: 300
        }
      ];

      for (const h of sampleHotspots) {
        await Hotspot.create(h);
      }
      console.log('[Database] Initial accident hotspots seeded.');
    }
  } catch (err) {
    console.error('[Database] Notice during seeding:', err.message);
  }
}

/**
 * Connect to MongoDB with intelligent fallback:
 * 1. Try configured MONGODB_URI (e.g. Atlas or local running daemon)
 * 2. If connection fails and URI is local, launch embedded MongoDB with persistent storage on port 27017
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saferoute';
  const isLocal = uri.includes('127.0.0.1') || uri.includes('localhost');

  try {
    console.log(`[Database] Attempting connection to: ${uri}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('[Database] Connected successfully to external/running MongoDB.');
    await seedDefaultData();
    return;
  } catch (initialErr) {
    if (!isLocal) {
      console.error('[Database] Connection to remote MongoDB failed:', initialErr.message);
      throw initialErr;
    }

    console.log('[Database] No running MongoDB service detected on local port.');
    console.log('[Database] Starting persistent embedded MongoDB instance...');

    const { MongoMemoryServer } = require('mongodb-memory-server');
    const dbPath = path.join(__dirname, '../../data/db');
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }

    try {
      embeddedMongoServer = await MongoMemoryServer.create({
        instance: {
          port: 27017,
          dbName: 'saferoute',
          dbPath: dbPath
        }
      });
    } catch (portConflictErr) {
      console.warn('[Database] Port 27017 conflict, allocating dynamic port...');
      embeddedMongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'saferoute',
          dbPath: dbPath
        }
      });
    }

    const embeddedUri = embeddedMongoServer.getUri() + 'saferoute';
    console.log(`[Database] Embedded MongoDB running on: ${embeddedUri}`);
    console.log(`[Database] Persistent storage path: ${dbPath}`);
    console.log(`[Database] MongoDB Compass connection string: ${embeddedMongoServer.getUri()}saferoute`);

    await mongoose.connect(embeddedUri);
    console.log('[Database] Mongoose connected to embedded MongoDB successfully.');

    await seedDefaultData();
  }
}

async function disconnectDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (embeddedMongoServer) {
      await embeddedMongoServer.stop();
      console.log('[Database] Embedded MongoDB server stopped cleanly.');
    }
  } catch (err) {
    console.error('[Database] Error during disconnect:', err.message);
  }
}

// Graceful cleanup on process exit
let cleanedUp = false;
async function handleExit() {
  if (cleanedUp) return;
  cleanedUp = true;
  await disconnectDB();
}

process.once('SIGINT', async () => {
  await handleExit();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  await handleExit();
  process.exit(0);
});

process.once('SIGUSR2', async () => {
  await handleExit();
  process.kill(process.pid, 'SIGUSR2');
});


module.exports = {
  connectDB,
  disconnectDB
};
