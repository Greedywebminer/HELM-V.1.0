// helm.js - Core orchestrator for HELM Miner OS backend (patched for Wi-Fi ADB)

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { installApks } = require("./utils/apkInstaller");
const { pushSetupScript, runSetupScript } = require("./utils/setupService");
const { getDevices, promoteToWifi } = require("./utils/sync");
const { reconnectSSH, pushSSHKey, getSSHInfo } = require("./utils/ssh");
const { switchPoolForDevice } = require("./utils/poolSwitcher");
const { monitorDevices } = require("./utils/watchdog");
const { MAX_PARALLEL_JOBS } = require("./utils/limits");
const { switchPool } = require("./utils/poolSwitcher");
const ADB = "adb";
const DEVICES_FILE = path.join(__dirname, "data", "devices.json");
let devices = {}; // ip ➜ device state
let isSaving = false;

function log(...args) {
  console.log("[HELM]", ...args);
}
const { promoteToTcpAdb } = require("./utils/adbReconnect");

async function reconnectAdb(deviceId) {
  const ip = await promoteToTcpAdb(deviceId);
  if (ip) {
    console.log(`[RECONNECT] ${deviceId} ➜ ${ip} is now on TCP ADB`);
  }
}




async function switchAllPools(pool) {
  const state = JSON.parse(fs.readFileSync("./data/device_state.json", "utf8"));
  const ips = Object.keys(state);
  return await switchPool(pool, ips);
}

module.exports = {
  switchAllPools,
  setupAll: async () => { /* your setup logic */ }
};

function saveDevices() {
  if (isSaving) return;
  isSaving = true;
  setTimeout(() => {
    fs.writeFile(DEVICES_FILE, JSON.stringify(devices, null, 2), (err) => {
      if (err) log("Save failed:", err);
      isSaving = false;
    });
  }, 1000);
}

async function getDeviceIP(serial) {
  return new Promise((resolve) => {
    exec(`${ADB} -s ${serial} shell ip -f inet addr show wlan0`, (err, stdout) => {
      const match = stdout.match(/inet (\d+\.\d+\.\d+\.\d+)/);
      resolve(match ? match[1] : serial);
    });
  });
}

async function setupDevice(serial) {
  try {
    log(`⚙️ Setting up ${serial}`);
    if (!serial.includes(":")) {
      await promoteToWifi(serial);
    }
    await pushSetupScript(serial);
    await runSetupScript(serial);
    await pushSSHKey(serial);
    await installApks(serial);
    const ip = await getDeviceIP(serial);
    const sshInfo = await getSSHInfo(serial);
    devices[ip] = {
      serial,
      ip,
      sshInfo,
      status: "✅ Ready",
      lastSeen: Date.now(),
    };
    saveDevices();
  } catch (err) {
    const ip = await getDeviceIP(serial);
    log(`❌ Setup failed for ${serial}:`, err.message || err);
    devices[ip] = { serial, ip, status: "❌ Failed" };
    saveDevices();
  }
}

async function setupAll() {
  const connected = await getDevices();
  const limited = connected.slice(0, MAX_PARALLEL_JOBS);
  await Promise.all(limited.map(setupDevice));
}

function startWatchdog() {
  monitorDevices(devices, (updated) => {
    for (const ip in updated) {
      devices[ip] = {
        ...devices[ip],
        ...updated[ip],
        lastSeen: Date.now(),
      };
    }
    saveDevices();
  });
}

async function switchAllPools(poolName) {
  for (const ip in devices) {
    try {
      await switchPoolForDevice(ip, poolName);
      devices[ip].pool = poolName;
    } catch (e) {
      devices[ip].status = "❌ Pool Switch Failed";
    }
  }
  saveDevices();
}

function printSummary() {
  console.log("\n--- Miner Summary ---");
  for (const ip in devices) {
    const d = devices[ip];
    console.log(`${ip} | ${d.status} | Pool: ${d.pool || "N/A"}`);
  }
}

module.exports = {
  setupAll,
  startWatchdog,
  switchAllPools,
  getDeviceIP,
  setupDevice,
  devices,
  printSummary,
};
