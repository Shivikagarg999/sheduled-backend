require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const app = express();
const { Server } = require("socket.io");
const Order = require("./models/order");
// ------------------- Routes -------------------
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes');
const driverRoutes = require('./routes/driverRoutes');
const supportRoutes = require('./routes/supportQueryRoutes');
const withdrawRoutes = require('./routes/withdrawRoutes');

const adminAuthRoutes = require('./routes/admin/auth');
const adminUserRoutes = require('./routes/admin/user');
const adminOrderRoutes = require('./routes/admin/order');
const adminDriverRoutes = require('./routes/admin/driver');
const adminDashboardRoutes= require('./routes/admin/dashboard');
const adminPayoutRoutes = require('./routes/admin/payout');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const userMap = new Map();
const driverMap = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

    // ============================================
  // ✅ NEW EVENTS FOR DELIVERY BOY APP
  // ============================================

  // Delivery boy registers (new event)
  socket.on('registerDriver', (data) => {
    const { driverId } = data;
    
    if (!driverId) {
      console.log('⚠️ Driver registration failed - no driverId');
      return;
    }

    console.log(`✅ Driver registered: ${driverId} (Socket: ${socket.id})`);
    
    // Add to existing driverMap
    driverMap.set(driverId, socket.id);
    
    socket.join(`driver_${driverId}`);
    
    socket.emit('driverConnected', {
      message: 'You are now online',
      driverId: driverId
    });
  });

  // Delivery boy sends location (new event)
  socket.on('driverLocation', (data) => {
    const { driverId, latitude, longitude, timestamp, trackingNumber } = data;
    
    console.log(`📍 Location from driver ${driverId}:`, {
      lat: latitude,
      lng: longitude,
      tracking: trackingNumber
    });

    // ✅ Broadcast to users tracking this order
    if (trackingNumber) {
      io.to(`order_${trackingNumber}`).emit('delivery_location', {
        latitude,
        longitude,
        driverId,
        timestamp: timestamp || new Date().toISOString(),
        trackingNumber
      });
      
      console.log(`📤 Broadcasted to order_${trackingNumber}`);
    }

    // Also send to all users (for backward compatibility)
    userMap.forEach((userSocketId, userId) => {
      io.to(userSocketId).emit("driverdata", {
        trackingNumber,
        driverId,
        location: { latitude, longitude },
      });
    });
  });

  // Order accepted event (new event)
  socket.on('orderAccepted', (data) => {
    const { orderId, driverId, trackingNumber } = data;
    
    console.log(`📦 Order ${orderId} accepted by driver ${driverId}`);

    // Notify users tracking this order
    io.to(`order_${trackingNumber}`).emit('orderAccepted', {
      message: 'Delivery boy accepted your order',
      driverId,
      orderId,
      trackingNumber
    });
  });

  // User tracks order by tracking number (new event)
  socket.on('trackOrder', (data) => {
    const { trackingNumber, userId } = data;
    
    console.log(`👤 User ${userId || 'unknown'} tracking order: ${trackingNumber}`);
    
    socket.join(`order_${trackingNumber}`);
    
    socket.emit('trackingStarted', {
      message: 'Tracking started',
      trackingNumber
    });
  });

  // User stops tracking (new event)
  socket.on('stopTracking', (data) => {
    const { trackingNumber } = data;
    console.log(`👤 User stopped tracking: ${trackingNumber}`);
    socket.leave(`order_${trackingNumber}`);
  });


  socket.on("join", (data) => {
    console.log("Data received in join:", data);
    if (data?.userId) {
      userMap.set(data.userId, socket.id);
      console.log(`User ${data.userId} mapped to socket ${socket.id}`);
    }
  });

  socket.on("driverjoin", (data) => {
    console.log("Driver joined:", data);
    if (data?.userId) {
      driverMap.set(data.userId, socket.id);
      console.log(`Driver ${data.userId} mapped to socket ${socket.id}`);
    }
  });

  socket.on("tracknum", async (data) => {
    try {
      console.log("Tracking request:", data);
      const trackingNumber = data.trackingnum;
      const driverId = data.driverId;

      if (!trackingNumber || !driverId) {
        socket.emit("tracknum-response", { error: "Missing tracking number or driver ID" });
        return;
      }

      const order = await Order.findOne({ trackingNumber })
        .populate("driver", "_id name phone vehicleNumber");

      if (!order) {
        socket.emit("tracknum-response", { error: "Order not found" });
        return;
      }

      console.log("Driver found:", order.driver?._id);
      const driverSocketId = driverMap.get(order.driver?._id.toString());

      if (driverSocketId) {
        console.log(`Sending sendLocation event to driver ${order.driver._id}`);

        io.to(driverSocketId).emit("sendLocation", { driverId, trackingNumber });
      } else {
        console.warn(`Driver ${order.driver._id} not connected`);
        socket.emit("tracknum-response", { error: "Driver not connected" });
      }
    } catch (err) {
      console.error("Error fetching order:", err);
      socket.emit("tracknum-response", { error: "Server error" });
    }
  });

socket.on("myLocation", (data) => {
  console.log("Driver's location received:", data);
  const { driverId, trackingNumber, location } = data;
  
  if (!driverId ||  !location) {
    console.warn("Invalid location data received:", data);
    return;
  }
  
  userMap.forEach((userSocketId, userId) => {
    console.log(` Broadcasting location to user ${userId}`);
    io.to(userSocketId).emit("driverdata", {
      trackingNumber,
      driverId,
      location,
    });
  });
});

  socket.on("disconnect", () => {
    userMap.forEach((value, key) => {
      if (value === socket.id) {
        userMap.delete(key);
        console.log(`🗑️ User ${key} disconnected and removed from map`);
      }
    });

    driverMap.forEach((value, key) => {
      if (value === socket.id) {
        driverMap.delete(key);
        console.log(`🗑️ Driver ${key} disconnected and removed from map`);
      }
    });

    console.log("User disconnected:", socket.id);
  });
});


// CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://sheduled.vercel.app",
    "https://www.sheduled.com",
    "https://sheduled-admin-t4nj.vercel.app",
    "https://www.admin.sheduled.com",
    "https://admin.sheduled.com"
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://sheduled.vercel.app',
    'https://www.sheduled.com',
    "https://sheduled-admin-t4nj.vercel.app"
  ],
  credentials: true,
}));

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('Connection error:', err));

// Test route
app.get('/', (req, res) => {
  res.send('App is running');
});

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/pay', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/withdraw', withdrawRoutes);

app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin/user', adminUserRoutes);
app.use('/api/admin/order', adminOrderRoutes);
app.use('/api/admin/driver', adminDriverRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/payout', adminPayoutRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
