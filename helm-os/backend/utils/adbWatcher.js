// utils/adbWatcher.js
const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
const { reconnectWirelessAdb } = require("./adbReconnect");

const DEVICE_STATE_PATH = path.join(__dirname, "../data/device_state.json");

function getDevicesFromADB() {
  try {
    const out = execSync("adb devices").toString();
    return out
      .split("\n")
      .slice(1)
      .map((line) => line.trim().split("\t")[0])
      .filter((x) => x && !x.includes("offline"));
  } catch (err) {
    console.error("⚠️ Failed to run adb devices:", err.message);
    return [];
  }
}

function loadDeviceState() {
  try {
    return JSON.parse(fs.readFileSync(DEVICE_STATE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveDeviceState(state) {
  fs.writeFileSync(DEVICE_STATE_PATH, JSON.stringify(state, null, 2));
}

async function checkAndReconnect() {
  const adbDevices = getDevicesFromADB();
  const state = loadDeviceState();

  for (const serial in state) {
    const device = state[serial];
    const ip = device.ip || serial; // Fallback if using IP as key

    const isConnected = adbDevices.includes(ip);
    if (!isConnected) {
      console.log(`🔌 [RECONNECT] ${serial} (${ip}) not connected via ADB, trying to reconnect...`);
      try {
        await reconnectWirelessAdb(serial);
        console.log(`✅ [RECONNECTED] ${serial}`);
      } catch (err) {
        console.warn(`❌ [FAILED] Reconnect ${serial} —`, err.message);
      }
    }
  }
}

function startWatcher(interval = 30000) {
  console.log(`🧿 ADB Watcher started. Checking every ${interval / 1000}s...`);
  setInterval(checkAndReconnect, interval);
}

module.exports = {
  startWatcher,
};
