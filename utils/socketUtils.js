const { activeConnections } = require('../socket/socketHandler');

const SocketUtils = {
  getConnectedDrivers: () => {
    const drivers = [];
    for (const [socketId, connection] of activeConnections) {
      if (connection.type === 'driver') {
        drivers.push({
          socketId,
          driverId: connection.driverId,
          driverName: connection.driverName,
          orderId: connection.orderId
        });
      }
    }
    return drivers;
  },

  getDriversByOrder: (orderId) => {
    return SocketUtils.getConnectedDrivers().filter(
      driver => driver.orderId === orderId
    );
  },

  sendToOrder: (io, orderId, event, data) => {
    io.to(orderId).emit(event, data);
  },

  notifyDriver: (io, driverSocketId, orderData) => {
    io.to(driverSocketId).emit('new-order', orderData);
  }
};

module.exports = SocketUtils;