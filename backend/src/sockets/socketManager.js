const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { calculateDistanceMeters } = require('../utils/distance');
const User = require('../models/User');

let io;

// Proximity threshold: 350 meters
const CLEAR_LANE_RADIUS_METERS = 350;

// In-memory active tracking maps
// activeUsers: socketId -> { socketId, userId, name, role, latitude, longitude, lastUpdated, socket }
const activeUsers = new Map();

// liveAmbulances: ambulanceId -> { socketId, ambulanceId, ambulanceName, vehicleNumber, driverName, phone, latitude, longitude, speed, heading, isLive, alertedUsers: Set<socketId> }
const liveAmbulances = new Map();

/**
 * Evaluates proximity between a given live ambulance and all currently active users.
 * Dispatches `ambulance:clear_lane_alert` to users within 350 meters and
 * `ambulance:clear_lane_cleared` to users who have moved out of the zone.
 */
function evaluateAmbulanceProximity(ambData) {
  if (!ambData || !ambData.isLive || ambData.latitude == null || ambData.longitude == null) {
    return 0;
  }

  const ambLat = ambData.latitude;
  const ambLng = ambData.longitude;

  if (!ambData.alertedUsers) {
    ambData.alertedUsers = new Set();
  }

  const currentNearbySocketIds = new Set();

  for (const [socketId, user] of activeUsers.entries()) {
    if (user.latitude == null || user.longitude == null) {
      continue;
    }

    const distMeters = calculateDistanceMeters(user.latitude, user.longitude, ambLat, ambLng);

    if (distMeters <= CLEAR_LANE_RADIUS_METERS) {
      currentNearbySocketIds.add(socketId);
      ambData.alertedUsers.add(socketId);

      const alertPayload = {
        alertId: `amb_${ambData.ambulanceId}`,
        ambulanceId: ambData.ambulanceId,
        ambulanceName: ambData.ambulanceName || 'Emergency Ambulance',
        vehicleNumber: ambData.vehicleNumber || 'Emergency Unit',
        driverName: ambData.driverName || 'Driver',
        phone: ambData.phone || '',
        latitude: ambLat,
        longitude: ambLng,
        userLatitude: user.latitude,
        userLongitude: user.longitude,
        speed: ambData.speed || 0,
        heading: ambData.heading || 0,
        distanceMeters: Math.round(distMeters),
        radiusThreshold: CLEAR_LANE_RADIUS_METERS,
        message: 'EMERGENCY: Ambulance is approaching! Clear the lane immediately.',
        timestamp: new Date().toISOString()
      };

      if (user.socket && user.socket.connected) {
        user.socket.emit('ambulance:clear_lane_alert', alertPayload);
      }
    } else {
      // If user was previously alerted by this ambulance, notify that zone is cleared
      if (ambData.alertedUsers.has(socketId)) {
        ambData.alertedUsers.delete(socketId);
        if (user.socket && user.socket.connected) {
          user.socket.emit('ambulance:clear_lane_cleared', {
            ambulanceId: ambData.ambulanceId,
            message: 'Ambulance is beyond safety clearance radius.'
          });
        }
      }
    }
  }

  // Notify ambulance room of how many users are currently within 350m
  if (io) {
    io.to(`ambulance:${ambData.ambulanceId}`).emit('ambulance:nearby_users_count', {
      count: currentNearbySocketIds.size,
      radiusMeters: CLEAR_LANE_RADIUS_METERS
    });
  }

  return currentNearbySocketIds.size;
}

/**
 * Evaluates proximity for a single user against all currently live ambulances.
 */
function evaluateUserProximity(userData) {
  if (!userData || userData.latitude == null || userData.longitude == null) {
    return;
  }

  const uLat = userData.latitude;
  const uLng = userData.longitude;

  for (const [ambId, amb] of liveAmbulances.entries()) {
    if (!amb.isLive || amb.latitude == null || amb.longitude == null) {
      continue;
    }

    const distMeters = calculateDistanceMeters(uLat, uLng, amb.latitude, amb.longitude);

    if (distMeters <= CLEAR_LANE_RADIUS_METERS) {
      if (!amb.alertedUsers) amb.alertedUsers = new Set();
      amb.alertedUsers.add(userData.socketId);

      const alertPayload = {
        alertId: `amb_${amb.ambulanceId}`,
        ambulanceId: amb.ambulanceId,
        ambulanceName: amb.ambulanceName || 'Emergency Ambulance',
        vehicleNumber: amb.vehicleNumber || 'Emergency Unit',
        driverName: amb.driverName || 'Driver',
        phone: amb.phone || '',
        latitude: amb.latitude,
        longitude: amb.longitude,
        userLatitude: uLat,
        userLongitude: uLng,
        speed: amb.speed || 0,
        heading: amb.heading || 0,
        distanceMeters: Math.round(distMeters),
        radiusThreshold: CLEAR_LANE_RADIUS_METERS,
        message: 'EMERGENCY: Ambulance is approaching! Clear the lane immediately.',
        timestamp: new Date().toISOString()
      };

      if (userData.socket && userData.socket.connected) {
        userData.socket.emit('ambulance:clear_lane_alert', alertPayload);
      }
    } else {
      if (amb.alertedUsers && amb.alertedUsers.has(userData.socketId)) {
        amb.alertedUsers.delete(userData.socketId);
        if (userData.socket && userData.socket.connected) {
          userData.socket.emit('ambulance:clear_lane_cleared', {
            ambulanceId: amb.ambulanceId,
            message: 'Ambulance is beyond safety clearance radius.'
          });
        }
      }
    }
  }
}

/**
 * Clears any active clear-lane alerts issued by an ambulance
 */
function clearAmbulanceAlerts(ambulanceId) {
  const amb = liveAmbulances.get(ambulanceId);
  if (amb && amb.alertedUsers) {
    for (const socketId of amb.alertedUsers) {
      const user = activeUsers.get(socketId);
      if (user && user.socket && user.socket.connected) {
        user.socket.emit('ambulance:clear_lane_cleared', {
          ambulanceId,
          message: 'Ambulance live emergency mode ended.'
        });
      }
    }
    amb.alertedUsers.clear();
  }
}

const socketManager = {
  init: (server) => {
    io = socketIo(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Socket Authentication Middleware
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // { userId, role, iat, exp }
        next();
      } catch (err) {
        return next(new Error("Authentication error: Invalid token"));
      }
    });

    io.on('connection', async (socket) => {
      console.log(`Socket connected: ${socket.id} (User: ${socket.user.userId}, Role: ${socket.user.role})`);

      // 1. POLICE: Join dedicated station room
      if (socket.user.role === 'POLICE') {
        const roomName = `police:${socket.user.userId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined room ${roomName}`);
      }
      
      // 2. AMBULANCE: Join dedicated ambulance room
      if (socket.user.role === 'AMBULANCE') {
        const roomName = `ambulance:${socket.user.userId}`;
        socket.join(roomName);
        console.log(`[SOCKET] Ambulance socket connected: ${socket.user.userId} (Room: ${roomName})`);

        // Check if DB says this ambulance is already live
        try {
          const ambulanceDoc = await User.findById(socket.user.userId);
          if (ambulanceDoc && ambulanceDoc.isLiveMode && ambulanceDoc.latitude != null && ambulanceDoc.longitude != null) {
            const ambEntry = {
              socketId: socket.id,
              ambulanceId: socket.user.userId,
              ambulanceName: ambulanceDoc.ambulanceName,
              vehicleNumber: ambulanceDoc.vehicleNumber,
              driverName: ambulanceDoc.driverName,
              phone: ambulanceDoc.phone,
              latitude: ambulanceDoc.latitude,
              longitude: ambulanceDoc.longitude,
              speed: ambulanceDoc.liveSpeed || 0,
              heading: ambulanceDoc.liveHeading || 0,
              isLive: true,
              alertedUsers: new Set()
            };
            liveAmbulances.set(socket.user.userId, ambEntry);
            socket.emit('ambulance:live_mode_status', { isLive: true, alertedUsersCount: 0 });
          }
        } catch (e) {
          console.error('[SOCKET] Error restoring ambulance live state:', e);
        }

        // Event: Toggle Live Mode (START / STOP)
        socket.on('ambulance:toggle_live_mode', async (data = {}, callback) => {
          try {
            const isLive = Boolean(data.isLive);
            const lat = parseFloat(data.latitude);
            const lng = parseFloat(data.longitude);
            const speed = parseFloat(data.speed) || 0;
            const heading = parseFloat(data.heading) || 0;

            console.log(`[SOCKET] Ambulance ${socket.user.userId} toggling live mode: ${isLive}`);

            const ambDoc = await User.findById(socket.user.userId);
            if (!ambDoc) {
              if (typeof callback === 'function') callback({ success: false, message: 'Ambulance not found' });
              return;
            }

            ambDoc.isLiveMode = isLive;
            if (!isNaN(lat) && !isNaN(lng)) {
              ambDoc.latitude = lat;
              ambDoc.longitude = lng;
            }
            ambDoc.liveSpeed = speed;
            ambDoc.liveHeading = heading;
            await ambDoc.save();

            let count = 0;
            if (isLive) {
              const ambEntry = {
                socketId: socket.id,
                ambulanceId: socket.user.userId,
                ambulanceName: ambDoc.ambulanceName || 'Emergency Ambulance',
                vehicleNumber: ambDoc.vehicleNumber || 'Emergency Unit',
                driverName: ambDoc.driverName || 'Driver',
                phone: ambDoc.phone || '',
                latitude: !isNaN(lat) ? lat : ambDoc.latitude,
                longitude: !isNaN(lng) ? lng : ambDoc.longitude,
                speed,
                heading,
                isLive: true,
                alertedUsers: new Set()
              };
              liveAmbulances.set(socket.user.userId, ambEntry);
              count = evaluateAmbulanceProximity(ambEntry);
            } else {
              clearAmbulanceAlerts(socket.user.userId);
              liveAmbulances.delete(socket.user.userId);
            }

            io.to(`ambulance:${socket.user.userId}`).emit('ambulance:live_mode_status', {
              isLive,
              alertedUsersCount: count,
              latitude: ambDoc.latitude,
              longitude: ambDoc.longitude
            });

            if (typeof callback === 'function') {
              callback({ success: true, isLive, alertedUsersCount: count });
            }
          } catch (err) {
            console.error('[SOCKET] ambulance:toggle_live_mode error:', err);
            if (typeof callback === 'function') callback({ success: false, message: err.message });
          }
        });

        // Event: Continuous Live Location Update while in Live Mode
        socket.on('ambulance:live_location', async (data = {}, callback) => {
          try {
            const lat = parseFloat(data.latitude);
            const lng = parseFloat(data.longitude);
            const speed = parseFloat(data.speed) || 0;
            const heading = parseFloat(data.heading) || 0;

            if (isNaN(lat) || isNaN(lng)) {
              if (typeof callback === 'function') callback({ success: false, message: 'Invalid coordinates' });
              return;
            }

            let ambEntry = liveAmbulances.get(socket.user.userId);
            if (!ambEntry) {
              // Auto-start live mode if coordinates are actively emitted
              const ambDoc = await User.findById(socket.user.userId);
              ambEntry = {
                socketId: socket.id,
                ambulanceId: socket.user.userId,
                ambulanceName: ambDoc ? ambDoc.ambulanceName : 'Emergency Ambulance',
                vehicleNumber: ambDoc ? ambDoc.vehicleNumber : 'Emergency Unit',
                driverName: ambDoc ? ambDoc.driverName : 'Driver',
                phone: ambDoc ? ambDoc.phone : '',
                latitude: lat,
                longitude: lng,
                speed,
                heading,
                isLive: true,
                alertedUsers: new Set()
              };
              liveAmbulances.set(socket.user.userId, ambEntry);
              await User.findByIdAndUpdate(socket.user.userId, { isLiveMode: true, latitude: lat, longitude: lng });
            } else {
              ambEntry.latitude = lat;
              ambEntry.longitude = lng;
              ambEntry.speed = speed;
              ambEntry.heading = heading;
              ambEntry.socketId = socket.id;
            }

            const alertedCount = evaluateAmbulanceProximity(ambEntry);

            if (typeof callback === 'function') {
              callback({ success: true, alertedUsersCount: alertedCount, latitude: lat, longitude: lng });
            }
          } catch (err) {
            console.error('[SOCKET] ambulance:live_location error:', err);
            if (typeof callback === 'function') callback({ success: false, message: err.message });
          }
        });
      }

      // 3. USER: Regular citizen / driver on the road
      if (socket.user.role === 'USER') {
        const userRoom = `user:${socket.user.userId}`;
        socket.join(userRoom);
        socket.join('users');
        console.log(`[SOCKET] User connected: ${socket.user.userId} (Joined ${userRoom})`);

        // Register in active users map
        const userDoc = await User.findById(socket.user.userId).catch(() => null);
        const userData = {
          socketId: socket.id,
          userId: socket.user.userId,
          name: userDoc ? userDoc.name : 'User',
          role: 'USER',
          latitude: userDoc && userDoc.latitude != null ? userDoc.latitude : null,
          longitude: userDoc && userDoc.longitude != null ? userDoc.longitude : null,
          lastUpdated: Date.now(),
          socket
        };
        activeUsers.set(socket.id, userData);

        // Check if user is already within range of any live ambulance
        if (userData.latitude != null && userData.longitude != null) {
          evaluateUserProximity(userData);
        }

        // Listen for user location updates (from map click, GPS watcher, or Driving Mode)
        socket.on('user:location', (data = {}, callback) => {
          try {
            const lat = parseFloat(data.latitude);
            const lng = parseFloat(data.longitude);

            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
              if (typeof callback === 'function') callback({ success: false, message: 'Invalid coordinates' });
              return;
            }

            userData.latitude = lat;
            userData.longitude = lng;
            userData.lastUpdated = Date.now();

            // Persist location in User document for consistency
            User.findByIdAndUpdate(socket.user.userId, { latitude: lat, longitude: lng }).catch(() => {});

            // Immediately evaluate if user is now within 350m of any live ambulance
            evaluateUserProximity(userData);

            if (typeof callback === 'function') {
              callback({ success: true, latitude: lat, longitude: lng });
            }
          } catch (err) {
            console.error('[SOCKET] user:location error:', err);
            if (typeof callback === 'function') callback({ success: false, message: err.message });
          }
        });
      }

      // 4. Handle Disconnect
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);

        if (socket.user && socket.user.role === 'USER') {
          activeUsers.delete(socket.id);
          // Remove from any ambulance alerted set
          for (const amb of liveAmbulances.values()) {
            if (amb.alertedUsers) amb.alertedUsers.delete(socket.id);
          }
        }

        if (socket.user && socket.user.role === 'AMBULANCE') {
          // Note: we can keep liveAmbulances active if reconnecting, or clear after timeout.
          // For safety, clear alerts if socket truly disconnected.
          setTimeout(() => {
            const amb = liveAmbulances.get(socket.user.userId);
            if (amb && amb.socketId === socket.id) {
              clearAmbulanceAlerts(socket.user.userId);
              liveAmbulances.delete(socket.user.userId);
              User.findByIdAndUpdate(socket.user.userId, { isLiveMode: false }).catch(() => {});
            }
          }, 3000);
        }
      });
    });

    return io;
  },
  
  getIo: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },

  /**
   * Programmatic method called by REST controllers to toggle ambulance live mode.
   */
  handleAmbulanceLiveMode: async (ambulanceId, isLive, latitude, longitude, speed = 0, heading = 0) => {
    try {
      const ambDoc = await User.findById(ambulanceId);
      if (!ambDoc) return { success: false, message: 'Ambulance not found' };

      ambDoc.isLiveMode = isLive;
      if (latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)) {
        ambDoc.latitude = latitude;
        ambDoc.longitude = longitude;
      }
      ambDoc.liveSpeed = speed;
      ambDoc.liveHeading = heading;
      await ambDoc.save();

      let alertedCount = 0;
      if (isLive) {
        const ambEntry = {
          ambulanceId: ambDoc._id.toString(),
          ambulanceName: ambDoc.ambulanceName || 'Emergency Ambulance',
          vehicleNumber: ambDoc.vehicleNumber || 'Emergency Unit',
          driverName: ambDoc.driverName || 'Driver',
          phone: ambDoc.phone || '',
          latitude: ambDoc.latitude,
          longitude: ambDoc.longitude,
          speed,
          heading,
          isLive: true,
          alertedUsers: new Set()
        };
        liveAmbulances.set(ambDoc._id.toString(), ambEntry);
        alertedCount = evaluateAmbulanceProximity(ambEntry);
      } else {
        clearAmbulanceAlerts(ambulanceId.toString());
        liveAmbulances.delete(ambulanceId.toString());
      }

      if (io) {
        io.to(`ambulance:${ambulanceId}`).emit('ambulance:live_mode_status', {
          isLive,
          alertedUsersCount: alertedCount,
          latitude: ambDoc.latitude,
          longitude: ambDoc.longitude
        });
      }

      return { success: true, isLive, alertedUsersCount: alertedCount, latitude: ambDoc.latitude, longitude: ambDoc.longitude };
    } catch (e) {
      console.error('handleAmbulanceLiveMode error:', e);
      return { success: false, message: e.message };
    }
  },

  /**
   * Programmatic method called by REST controllers to update live ambulance location.
   */
  handleAmbulanceLocationUpdate: async (ambulanceId, latitude, longitude, speed = 0, heading = 0) => {
    try {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng)) return { success: false, message: 'Invalid coordinates' };

      let ambEntry = liveAmbulances.get(ambulanceId.toString());
      if (!ambEntry) {
        const ambDoc = await User.findById(ambulanceId);
        if (!ambDoc) return { success: false, message: 'Ambulance not found' };
        ambDoc.isLiveMode = true;
        ambDoc.latitude = lat;
        ambDoc.longitude = lng;
        await ambDoc.save();

        ambEntry = {
          ambulanceId: ambDoc._id.toString(),
          ambulanceName: ambDoc.ambulanceName || 'Emergency Ambulance',
          vehicleNumber: ambDoc.vehicleNumber || 'Emergency Unit',
          driverName: ambDoc.driverName || 'Driver',
          phone: ambDoc.phone || '',
          latitude: lat,
          longitude: lng,
          speed,
          heading,
          isLive: true,
          alertedUsers: new Set()
        };
        liveAmbulances.set(ambulanceId.toString(), ambEntry);
      } else {
        ambEntry.latitude = lat;
        ambEntry.longitude = lng;
        ambEntry.speed = speed;
        ambEntry.heading = heading;
      }

      const alertedCount = evaluateAmbulanceProximity(ambEntry);
      return { success: true, latitude: lat, longitude: lng, alertedUsersCount: alertedCount };
    } catch (e) {
      console.error('handleAmbulanceLocationUpdate error:', e);
      return { success: false, message: e.message };
    }
  },

  /**
   * Programmatic method for user location update via REST.
   */
  handleUserLocationUpdate: (userId, latitude, longitude) => {
    for (const [sId, user] of activeUsers.entries()) {
      if (user.userId.toString() === userId.toString()) {
        user.latitude = parseFloat(latitude);
        user.longitude = parseFloat(longitude);
        user.lastUpdated = Date.now();
        evaluateUserProximity(user);
      }
    }
  },

  CLEAR_LANE_RADIUS_METERS
};

module.exports = socketManager;
