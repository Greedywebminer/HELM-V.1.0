// === backend/utils/termuxRestarter.js ===
const { runAdb } = require("./adb");
const fs = require("fs");
const path = require("path");

const DEVICES_FILE = path.resolve(__dirname, "../data/devices.json");

function loadDevices() {
  return fs.existsSync(DEVICES_FILE)
    ? JSON.parse(fs.readFileSync(DEVICES_FILE))
    : {};
}

async function restartTermux(ip) {
  return runAdb(`-s ${ip}:5555 shell am startservice com.termux/.app.TermuxService`);
}

async function restartTermuxAll() {
  const devices = loadDevices();
  const results = [];
  for (const ip of Object.keys(devices)) {
    try {
      await restartTermux(ip);
      results.push(ip);
    } catch (err) {
      console.error(`Failed to restart Termux on ${ip}:`, err.message);
    }
  }
  return results;
}

async function restartTermuxSelected(ips) {
  const results = [];
  for (const ip of ips) {
    try {
      await restartTermux(ip);
      results.push(ip);
    } catch (err) {
      console.error(`Failed to restart Termux on ${ip}:`, err.message);
    }
  }
  return results;
}

module.exports = {
  restartTermuxAll,
  restartTermuxSelected,
};
