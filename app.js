require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const app = express();
const { Server } = require("socket.io");
const Order = require("./models/order");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const userMap = new Map();   // customers
const driverMap = new Map(); // drivers

// 🚀 Socket.io setup
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // 📌 Normal user join
  socket.on("join", (data) => {
    console.log("📩 Data received in join:", data);
    if (data?.userId) {
      userMap.set(data.userId, socket.id);
      console.log(`📝 User ${data.userId} mapped to socket ${socket.id}`);
    }
  });

  // 📌 Driver join
  socket.on("driverjoin", (data) => {
    console.log("📩 Driver joined:", data);
    if (data?.userId) {
      driverMap.set(data.userId, socket.id);
      console.log(`📝 Driver ${data.userId} mapped to socket ${socket.id}`);
    }
  });

  // 📌 Tracking number se driver details fetch
  socket.on("tracknum", async (data) => {
    try {
      console.log("📩 Tracking request:", data);
      const trackingNumber = data.trackingnum;

      const order = await Order.findOne({ trackingNumber })
        .populate("driver", "_id name phone vehicleNumber");

      if (!order) {
        socket.emit("tracknum-response", { error: "Order not found" });
        return;
      }

      console.log("✅ Driver found:", order.driver?._id);

      socket.emit("driverdata", {
        trackingNumber: order.trackingNumber,
        driverId: order.driver?._id || null,
        driverDetails: order.driver || null,
        status: order.status,
      });
    } catch (err) {
      console.error("❌ Error fetching order:", err);
      socket.emit("tracknum-response", { error: "Server error" });
    }
  });

  // 📌 Driver live location update
  socket.on("driverLocationUpdate", (data) => {
    const { driverId, trackingNumber, latitude, longitude } = data;
    console.log(`📍 Driver ${driverId} location: ${latitude}, ${longitude}`);

    // customer ko forward karo (trackingNumber ko room jaisa use kar sakte ho)
    io.emit(`driverLocation-${trackingNumber}`, {
      driverId,
      latitude,
      longitude
    });
  });

  // 📌 Message example
  socket.on("sendToUser", ({ targetUserId, message }) => {
    const targetSocketId = userMap.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("message", {
        from: socket.id,
        message,
      });
      console.log(`📤 Message sent to ${targetUserId}`);
    } else {
      console.log(`⚠️ User ${targetUserId} not connected`);
    }
  });

  // 📌 Disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ------------------- Routes & Middleware -------------------
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
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ Connection error:', err));

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

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} with Socket.io`);
});
