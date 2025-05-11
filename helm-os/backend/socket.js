const { Server } = require('socket.io');

let io;

/**
 * Initializes the Socket.IO server instance.
 * Should be called from server.js and passed the HTTP server.
 */
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173', // Frontend origin
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  io.on("connection", (socket) => {
    console.log("✅ Socket.IO client connected:", socket.id);

    // Handle client room subscriptions
    socket.on("subscribeToDevice", (ip) => {
      socket.join(`device:${ip}`);
      console.log(`🔌 ${socket.id} subscribed to device:${ip}`);
    });

    socket.on("unsubscribeFromDevice", (ip) => {
      socket.leave(`device:${ip}`);
      console.log(`❌ ${socket.id} unsubscribed from device:${ip}`);
    });

    // Cleanup on disconnect (optional logging)
    socket.on("disconnect", () => {
      console.log("🚪 Socket disconnected:", socket.id);
      // Rooms are auto-cleaned by Socket.IO
    });
  });

  return io;
}

/**
 * Returns the initialized Socket.IO instance.
 * Throws if `initSocket()` hasn't been called yet.
 */
function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

module.exports = { initSocket, getIO };
