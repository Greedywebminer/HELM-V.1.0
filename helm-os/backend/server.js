const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { execSync } = require('child_process');
const pLimit = require('p-limit');

const { initSocket } = require('./socket'); // ✅ Use socket wrapper
const { initDb, upsertDevice, listDevices, deleteDevice } = require('./devicesDb');
const { installApksIfNeeded, installByFilename } = require('./utils/apkInstaller');
const { switchPoolAll } = require('./utils/poolSwitcher');
const apiRoutes = require('./api');
app.use('/api', apiRoutes);

const app = express();
const server = http.createServer(app);
const io = initSocket(server); // ✅ Use the correctly initialized io instance

// === CONFIG ===
const ADB = process.env.ADB_PATH || path.join(process.env.HOME, 'Desktop/platform-tools/adb');
const SCAN_INTERVAL = 30_000;
const CONCURRENCY = 50;
const limit = pLimit(CONCURRENCY);

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());
app.use("/api", apiRoutes);

// === UTILS ===
function extractIp(serial) {
  try {
    const out = execSync(`${ADB} -s ${serial} shell ip -f inet addr show wlan0`).toString();
    const m = out.match(/inet (\d+\.\d+\.\d+\.\d+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// === DEVICE SYNC ===
async function syncAllDevices() {
  await initDb();
  const raw = execSync(`${ADB} devices`).toString().split('\n').slice(1);
  const tasks = raw
    .filter(line => line.trim().endsWith('device'))
    .map(line => {
      const serial = line.split('\t')[0];
      return limit(async () => {
        const ip = extractIp(serial);
        await upsertDevice(serial, ip);
      });
    });

  await Promise.all(tasks);

  // ✅ Emit individual updates to subscribers only
  const devs = await listDevices();
  devs.forEach((device) => {
    if (device.ip) {
      io.to(`device:${device.ip}`).emit("deviceUpdate", device);
    }
  });
}

// === SCHEDULED SYNC ===
// Start sync loop on launch
;(async () => {
  await syncAllDevices();
  setInterval(syncAllDevices, SCAN_INTERVAL);
})();

// === API ENDPOINTS ===
app.get('/api/devices', async (req, res) => {
  const all = await listDevices();
  res.json(all);
});

app.delete('/api/devices/:serial', async (req, res) => {
  const ok = await deleteDevice(req.params.serial);
  await syncAllDevices();
  res.json({ status: ok ? 'Deleted' : 'NotFound' });
});

app.post('/api/run-setup/:serial', async (req, res) => {
  const serial = req.params.serial;
  const script = path.resolve(process.env.HOME, 'Desktop/Setup/setup.sh');
  try {
    execSync(`${ADB} -s ${serial} push "${script}" /sdcard/setup.sh`, { stdio: 'inherit' });
    execSync(`${ADB} -s ${serial} shell am start -n com.termux/.app.TermuxActivity`, { stdio: 'inherit' });
    res.json({ status: 'Launched' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/apk-install/:serial', async (req, res) => {
  const serial = req.params.serial;
  try {
    await installApksIfNeeded(serial);
    res.json({ status: 'APK install complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pool/:poolName', async (req, res) => {
  const pool = req.params.poolName;
  const devices = Object.values(await listDevices());
  try {
    await switchPoolAll(devices, pool);
    res.json({ status: `Dispatched pool switch to ${devices.length} devices` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/apk-install/:ip/:filename", async (req, res) => {
  const { ip, filename } = req.params;
  try {
    const result = await installByFilename(ip, filename);
    res.json({ status: result });
  } catch (err) {
    console.error(`Install failed on ${ip}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// === SOCKET.IO CONNECTION HANDLER ===
io.on('connection', async (socket) => {
  console.log("🔌 New client connected:", socket.id);
  const devs = await listDevices();
  socket.emit('deviceList', devs);
});

// === SERVER START ===
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 HELM OS backend listening on http://localhost:${PORT}`);
});
