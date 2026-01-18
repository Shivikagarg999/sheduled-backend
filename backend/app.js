require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const app = express();
const { Server } = require("socket.io");
const Order = require("./models/order");
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
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
    origin: [
      "http://localhost:3000",
      "https://sheduled.vercel.app",
      "https://www.sheduled.com",
      "https://sheduled-admin-t4nj.vercel.app",
      "https://www.admin.sheduled.com",
      "https://admin.sheduled.com"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling']
});

const userMap = new Map();
const driverMap = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

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
    
    if (!driverId || !location) {
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

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:3000",
      "https://sheduled.vercel.app",
      "https://www.sheduled.com",
      "https://sheduled-admin-t4nj.vercel.app",
      "https://www.admin.sheduled.com",
      "https://admin.sheduled.com"
    ];
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.options('*', cors());

app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('Connection error:', err));

app.get('/', (req, res) => {
  res.send('App is running');
});

app.use('/api/orders', orderRoutes);
app.use('/api/pay', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/proposal', proposalRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin/user', adminUserRoutes);
app.use('/api/admin/order', adminOrderRoutes);
app.use('/api/admin/driver', adminDriverRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/payout', adminPayoutRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});