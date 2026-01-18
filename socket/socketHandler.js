const Order = require('../models/order');
const Driver = require('../models/driver');

// Store active connections
const activeConnections = new Map();

function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Driver authentication
    socket.on('driver-authenticate', async (driverId) => {
      try {
        const driver = await Driver.findById(driverId);
        if (driver) {
          activeConnections.set(socket.id, { 
            type: 'driver', 
            driverId: driverId,
            driverName: driver.name,
            isAvailable: true
          });
          
          driver.socketId = socket.id;
          driver.isAvailable = true;
          await driver.save();
          
          console.log(`Driver ${driver.name} authenticated: ${socket.id}`);
          
          // Send available orders to driver
          const availableOrders = await Order.find({
            status: 'pending',
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
          }).limit(20);
          
          socket.emit('driver-authenticated', { 
            success: true,
            availableOrders: availableOrders
          });
        }
      } catch (error) {
        console.error('Driver authentication error:', error);
        socket.emit('driver-authenticated', { success: false, error: error.message });
      }
    });

    // Driver requests available orders
    socket.on('request-available-orders', async () => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || connection.type !== 'driver') {
          return socket.emit('error', { message: 'Unauthorized' });
        }

        const availableOrders = await Order.find({
          status: 'pending',
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }).limit(20);
        
        socket.emit('available-orders', availableOrders);
      } catch (error) {
        console.error('Error fetching available orders:', error);
        socket.emit('error', { message: 'Failed to fetch orders' });
      }
    });

    // Driver accepts an order
    socket.on('driver-accept-order', async (orderId) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || connection.type !== 'driver') {
          return socket.emit('error', { message: 'Unauthorized' });
        }

        const driver = await Driver.findById(connection.driverId);
        const order = await Order.findById(orderId);
        
        if (!order) {
          return socket.emit('error', { message: 'Order not found' });
        }
        
        if (order.status !== 'pending') {
          return socket.emit('error', { message: 'Order already taken' });
        }

        // Update order with driver info
        order.driver = connection.driverId;
        order.status = 'accepted';
        order.driverDetails = {
          name: driver.name,
          phone: driver.phone,
          vehicleNumber: driver.vehicle?.number
        };
        
        await order.save();
        
        // Update driver info
        driver.currentOrder = orderId;
        driver.isAvailable = false;
        await driver.save();
        
        // Update connection info
        activeConnections.set(socket.id, {
          ...connection,
          orderId: orderId,
          isAvailable: false
        });
        
        // Join order room
        socket.join(orderId);
        
        // Notify user that driver has accepted
        io.to(orderId).emit('driver-accepted', {
          driver: {
            name: driver.name,
            phone: driver.phone,
            vehicleNumber: driver.vehicle?.number
          },
          message: 'Driver has accepted your order'
        });
        
        socket.emit('order-accepted', { 
          success: true, 
          order: order 
        });
        
        console.log(`Driver ${driver.name} accepted order: ${orderId}`);
        
        // Notify other drivers that order is taken
        const drivers = Array.from(activeConnections.entries())
          .filter(([_, conn]) => conn.type === 'driver' && conn.socketId !== socket.id);
        
        drivers.forEach(([socketId, conn]) => {
          io.to(socketId).emit('order-taken', { orderId });
        });
        
      } catch (error) {
        console.error('Error accepting order:', error);
        socket.emit('error', { message: 'Failed to accept order' });
      }
    });

    // Driver joins order room (after acceptance)
    socket.on('driver-join-order', async (orderId) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || connection.type !== 'driver') {
          return socket.emit('error', { message: 'Unauthorized' });
        }

        const order = await Order.findById(orderId).populate('driver');
        if (order && order.driver._id.toString() === connection.driverId) {
          socket.join(orderId);
          activeConnections.set(socket.id, { 
            ...connection, 
            orderId 
          });
          
          console.log(`Driver ${order.driver.name} joined order room: ${orderId}`);
          
          // Send current location if available
          if (order.deliveryBoyLocation && order.deliveryBoyLocation.coordinates[0] !== 0) {
            io.to(orderId).emit('location-update', {
              lat: order.deliveryBoyLocation.coordinates[1],
              lng: order.deliveryBoyLocation.coordinates[0],
              address: order.deliveryBoyLocation.address,
              timestamp: order.deliveryBoyLocation.updatedAt
            });
          }
        }
      } catch (error) {
        console.error('Driver join order error:', error);
      }
    });

    // User joins to track order
    socket.on('user-join-order', (orderId) => {
      socket.join(orderId);
      activeConnections.set(socket.id, { 
        type: 'user', 
        orderId 
      });
      console.log(`User joined order room: ${orderId}`);
    });

    // Receive delivery boy location updates
    socket.on('driver-location-update', async ({ orderId, lat, lng, address }) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || connection.type !== 'driver') {
          return socket.emit('error', { message: 'Unauthorized location update' });
        }

        // Update driver's location
        const driver = await Driver.findById(connection.driverId);
        if (driver) {
          await driver.updateLocation(lng, lat);
        }

        // Update order's delivery boy location
        await Order.findByIdAndUpdate(orderId, {
          deliveryBoyLocation: {
            type: 'Point',
            coordinates: [lng, lat],
            address: address || `Lat: ${lat}, Lng: ${lng}`,
            updatedAt: new Date()
          },
          status: order.status === 'accepted' ? 'in_transit' : order.status
        });

        // Broadcast to all users tracking this order
        io.to(orderId).emit('location-update', { 
          lat, 
          lng, 
          address,
          timestamp: new Date().toISOString(),
          driver: driver ? {
            name: driver.name,
            phone: driver.phone,
            vehicleNumber: driver.vehicle?.number
          } : null
        });
        
        console.log(`Location updated for order ${orderId}: ${lat}, ${lng}`);
      } catch (error) {
        console.error('Error updating location:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    // Order status updates
    socket.on('order-status-update', async ({ orderId, status }) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || connection.type !== 'driver') {
          return socket.emit('error', { message: 'Unauthorized status update' });
        }

        const order = await Order.findByIdAndUpdate(orderId, { 
          status,
          updatedAt: new Date()
        }, { new: true });

        io.to(orderId).emit('status-update', { 
          status,
          timestamp: new Date().toISOString(),
          message: `Order status changed to: ${status.replace('_', ' ')}`
        });
        
        // If order is delivered, make driver available again
        if (status === 'delivered' || status === 'cancelled') {
          const driver = await Driver.findById(connection.driverId);
          if (driver) {
            driver.isAvailable = true;
            driver.currentOrder = null;
            await driver.save();
            
            activeConnections.set(socket.id, {
              ...connection,
              isAvailable: true,
              orderId: null
            });
            
            socket.leave(orderId);
            
            // Send available orders to driver
            const availableOrders = await Order.find({
              status: 'pending',
              createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }).limit(20);
            
            socket.emit('available-orders', availableOrders);
          }
        }
        
        console.log(`Status updated for order ${orderId}: ${status}`);
      } catch (error) {
        console.error('Error updating status:', error);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Driver completes order and becomes available
    socket.on('driver-complete-order', async (orderId) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || connection.type !== 'driver') {
          return socket.emit('error', { message: 'Unauthorized' });
        }

        const driver = await Driver.findById(connection.driverId);
        if (driver) {
          driver.isAvailable = true;
          driver.currentOrder = null;
          await driver.save();
          
          activeConnections.set(socket.id, {
            ...connection,
            isAvailable: true,
            orderId: null
          });
          
          socket.leave(orderId);
          
          // Send available orders to driver
          const availableOrders = await Order.find({
            status: 'pending',
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }).limit(20);
          
          socket.emit('available-orders', availableOrders);
          socket.emit('order-completed', { success: true });
        }
      } catch (error) {
        console.error('Error completing order:', error);
        socket.emit('error', { message: 'Failed to complete order' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      const connection = activeConnections.get(socket.id);
      if (connection) {
        if (connection.type === 'driver') {
          // Update driver availability
          await Driver.findByIdAndUpdate(connection.driverId, {
            socketId: null,
            isAvailable: false
          });
          
          if (connection.orderId) {
            io.to(connection.orderId).emit('driver-disconnected', {
              message: 'Driver connection lost. Tracking paused.'
            });
          }
          
          console.log(`Driver ${connection.driverName} disconnected`);
        }
        
        activeConnections.delete(socket.id);
      }
      console.log('User disconnected:', socket.id);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
}

module.exports = { initializeSocket, activeConnections };