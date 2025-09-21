// server.js
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

const userMap = new Map();
const driverMap = new Map();

// Jab client connect karega
io.on("connection", (socket) => {
  
  console.log("✅ User connected:", socket.id);

  // Client se event listen
  socket.on("join", (data) => {
    console.log("📩 Data received:", data);
    if (data?.userId) {
      userMap.set(data.userId, socket.id);
      console.log(`📝 User ${data.userId} mapped to socket ${socket.id}`);
    }
     const targetSocketId = userMap.get("1234");
    if (targetSocketId) {
      io.to(targetSocketId).emit("message", {
        from: socket.id,
        latitude:79908,
        longitude:90909
      });[]
    }
  });

   socket.on("driverjoin", (data) => {
    console.log("📩 driver joined:", data);
    if (data?.userId) {
      driverMap.set(data.userId, socket.id);
      console.log(driverMap)
      console.log(`📝 driver ${data.userId} mapped to socket ${socket.id}`);
    }
     const targetSocketId = driverMap.get("1234");
    if (targetSocketId) {
      io.to(targetSocketId).emit("message", {
        from: socket.id,
        latitude:79908,
        longitude:90909
      });[]
    }
  });

   socket.on("tracknum", async (data) => {
    try {
      console.log("📩 Data received:", data);

      // tracking number frontend se
      const trackingNumber = data.trackingnum;

      // order dhundo aur driver populate karo
      const order = await Order.findOne({ trackingNumber })
        .populate("driver", "_id name phone vehicleNumber"); // sirf driver ke fields lao
      if (!order) {
        socket.emit("tracknum-response", { error: "Order not found" });
        return;
      }
      console.log("✅ Driver found:", order.driver?._id);
      console.log(driverMap)
      // driver details bhej do
      socket.emit("driverdata", {
        trackingNumber: order.trackingNumber,
        driverId: order.driver?._id || null,
        driverDetails: order.driverDetails || order.driver || null,
        status: order.status,
        latitude: "12456",
        longitude:"09890"
      });

      console.log("✅ Driver ID found:", order.driver);
    } catch (err) {
      console.error("❌ Error fetching order:", err);
      socket.emit("tracknum-response", { error: "Server error" });
    }
  });

  // baad me use krenge
    socket.on("sendToUser", ({ targetUserId, message }) => {
    const targetSocketId = userMap.get(1234);
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

  // Disconnect event
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// Import routes
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
  ]
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
  origin: ['http://localhost:3000', 'https://sheduled.vercel.app', 'https://www.sheduled.com', "https://sheduled-admin-t4nj.vercel.app"],
  credentials: true,
}));

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connecteddddd'))
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