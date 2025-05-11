const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { runAdb } = require("./adb");

function getDevices() {
  const out = execSync("adb devices").toString();
  return out
    .split("\n")
    .slice(1)
    .map(line => line.trim().split("\t")[0])
    .filter(x => x && !x.includes(":"));
}

async function promoteToWifi(serial) {
  try {
    // 1. Get the device's IP address BEFORE switching to TCP mode
    const ipOut = await runAdb(`-s ${serial} shell ip -f inet addr show wlan0`);
    const match = ipOut.match(/inet (\d+\.\d+\.\d+\.\d+)/);
    if (!match) {
      console.warn(`[WIFI IP FAIL] ${serial}`);
      return;
    }

    const ip = match[1];
    console.log(`[WIFI] ${serial} has IP ${ip}`);

    // 2. Only run tcpip if device is still on USB (serial won't have colon)
    if (!serial.includes(":")) {
      await runAdb(`-s ${serial} tcpip 5555`);
      console.log(`[ADB] ${serial} switched to TCP mode`);
      await new Promise(r => setTimeout(r, 1000)); // Wait for daemon restart
    }

    // 3. Connect over Wi-Fi (with retry loop)
    let connected = false;
    for (let i = 0; i < 5; i++) {
      const connectRes = await runAdb(`connect ${ip}:5555`);
      if (connectRes.includes("connected")) {
        connected = true;
        console.log(`[PROMOTE] ${serial} ➜ ${ip} ➜ ${connectRes.trim()}`);
        break;
      }
      console.log(`[RETRY] Waiting to reconnect... (${i + 1}/5)`);
      await new Promise(r => setTimeout(r, 1500));
    }

    if (!connected) {
      console.warn(`[ADB] Failed to connect to ${ip} after 5 attempts`);
      return;
    }

    // 4. Save device to JSON database
    const dbPath = path.resolve(__dirname, "../data/devices.json");
    const devices = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {};
    devices[ip] = { promotedFrom: serial };
    fs.writeFileSync(dbPath, JSON.stringify(devices, null, 2));

  } catch (err) {
    console.warn(`[PROMOTE FAIL] ${serial}: ${err.message}`);
  }
}

async function reconnectWirelessAdb() {
  const output = execSync("adb devices").toString();
  const lines = output.split("\n").slice(1).filter(l => l.includes("device"));

  for (const line of lines) {
    const serial = line.split("\t")[0];
    try {
      execSync(`adb -s ${serial} tcpip 5555`);
      console.log(`🔌 Switched ${serial} to TCP mode`);
    } catch (err) {
      console.warn(`❌ Failed to switch ${serial} to TCP mode: ${err.message}`);
    }
  }
}

module.exports = {
  getDevices,
  promoteToWifi,
  reconnectWirelessAdb
};
