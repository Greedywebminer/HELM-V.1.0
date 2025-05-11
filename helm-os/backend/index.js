const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process"); 

const app = express();
const server = http.createServer(app);

const { reconnectWirelessAdb } = require("./utils/adbReconnect");
const { startWatcher } = require("./utils/adbWatcher");
const { getDevices, promoteToWifi } = require("./utils/sync");
const helm = require("./helm");

// ✅ Start reconnect logic on boot (wrapped in async IIFE)
(async () => {
  const state = JSON.parse(fs.readFileSync("./data/device_state.json", "utf8"));
  const connected = execSync("adb devices").toString()
    .split("\n").slice(1)
    .map(line => line.trim().split("\t")[0])
    .filter(x => x && !x.includes("offline"));

  for (const serial of Object.keys(state)) {
    if (!connected.includes(serial)) {
      console.log(`🔌 Reconnecting missing device: ${serial}`);
      try {
        await reconnectWirelessAdb(serial);
      } catch (err) {
        console.warn(`❌ Failed to reconnect ${serial}:`, err.message);
      }
    }
  }

  // ✅ Periodically promote USB ➜ WiFi
  setInterval(async () => {
    const usbDevices = await getDevices();
    for (const serial of usbDevices) {
      console.log(`Promoting USB device: ${serial}`);
      await promoteToWifi(serial);
    }
  }, 15000);
})();

// ✅ Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// ✅ Routes
app.use("/api", require("./routes/api"));
app.use("/api", require("./routes/deviceActions"));
app.use("/api/device-info", require("./routes/deviceInfo"));
app.use("/api/ssh", require("./routes/ssh"));

// ✅ WebSocket
const io = new Server(server, { cors: { origin: "*" }, path: "/socket.io" });
require("./ws/ssh")(io);

// ✅ Monitor
helm.devices = {};
const { monitorDevices } = require("./utils/watchdog");
monitorDevices((updates) => {
  Object.assign(helm.devices, updates);
  io.emit("devices", helm.devices);
});

// ✅ API utility routes
app.get("/status", (req, res) => {
  res.json({ running: true, devices: Object.keys(helm.devices).length });
});

app.post("/setup", async (req, res) => {
  await helm.setupAll();
  res.json({ message: "Setup triggered." });
});

app.post("/pool", async (req, res) => {
  const { pool } = req.body;
  if (!pool) return res.status(400).json({ error: "Missing pool name." });
  await helm.switchAllPools(pool);
  res.json({ message: `Switched to pool ${pool}` });
});

// ✅ WebSocket push
io.on("connection", (socket) => {
  console.log("Client connected");
  socket.emit("devices", helm.devices);
});

// ✅ Start watchdog & backend server
startWatcher(30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ HELM Miner OS backend running on port ${PORT}`);
});
