const { exec } = require("child_process");
const ADB = process.env.ADB_PATH || "adb";

function runAdb(cmd) {
  return new Promise((resolve, reject) => {
    exec(`${ADB} ${cmd}`, { shell: true }, (err, stdout, stderr) => {
      if (err) {
        console.warn(`[ADB] Error running: ${cmd}`);
        console.warn(stderr || err.message);
        return resolve(""); // prevent crash
      }
      resolve(stdout.trim());
    });
  });
}

async function extractIp(serial) {
  try {
    const ipOut = await runAdb(`-s ${serial} shell ip -f inet addr show wlan0`);
    const m = ipOut.match(/inet (\d+\.\d+\.\d+\.\d+)/);
    return m ? m[1] : null;
  } catch (err) {
    console.warn(`[ADB] extractIp failed for ${serial}: ${err.message}`);
    return null;
  }
}

async function getMinimalInfo(serial) {
  let ip = null, temperature = "Unavailable", internet = "❌";

  try {
    ip = await extractIp(serial);

    const tempRaw = await runAdb(`-s ${serial} shell dumpsys battery | grep temperature`);
    const m = tempRaw.match(/temperature:\s*(\d+)/);
    if (m) {
      const cTenths = parseInt(m[1], 10);
      const fahrenheit = (cTenths / 10) * 9/5 + 32;
      temperature = `${fahrenheit.toFixed(1)}°F`;
    }

    const netRaw = await runAdb(`-s ${serial} shell "ping -c 1 -W 1 google.com > /dev/null && echo ✅ || echo ❌"`);
    internet = netRaw.trim();
  } catch (err) {
    console.warn(`[ADB] getMinimalInfo failed for ${serial}: ${err.message}`);
  }

  return { ip, temperature, internet };
}

async function getHashrate(serial) {
  try {
    const log = await runAdb(`-s ${serial} shell "if [ -f /sdcard/miner.log ]; then tail -n 20 /sdcard/miner.log; fi"`);
    const matches = log.match(/([0-9.]+)\s*(KH\/s|MH\/s|H\/s)/g);
    if (!matches) return { hashrate: "N/A", color: "red" };
    const last = matches[matches.length - 1];
    const parts = last.match(/([0-9.]+)|([A-Za-z\/]+)/g);
    const value = parts[0], unit = parts[1];
    const v = parseFloat(value);
    const color = (unit === "MH/s" || (unit === "KH/s" && v > 100)) ? "green" : (unit === "H/s" ? "red" : "yellow");
    return { hashrate: `${value} ${unit}`, color };
  } catch (err) {
    console.warn(`[ADB] getHashrate failed for ${serial}: ${err.message}`);
    return { hashrate: "N/A", color: "red" };
  }
}

async function listSerials() {
  try {
    const out = await runAdb("devices");
    return out
      .split("\n")
      .slice(1)
      .map(line => line.split("\t")[0])
      .filter(serial => serial && !serial.startsWith("*"));
  } catch (err) {
    console.warn("[ADB] listSerials failed:", err.message);
    return [];
  }
}

async function connect(ip) {
  try {
    return await runAdb(`connect ${ip}:5555`);
  } catch (err) {
    console.warn(`[ADB] connect failed for ${ip}: ${err.message}`);
    return null;
  }
}

module.exports = {
  runAdb,
  extractIp,
  getMinimalInfo,
  getHashrate,
  listSerials,
  connect,
};
