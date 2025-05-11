const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { fullRecovery } = require("./fullRecovery");

const PING_INTERVAL = 12000; // ms between cycles

function isValidIP(ip) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip);
}

async function getConnectedADBCount() {
  try {
    const { stdout } = await exec(`adb devices`);
    const lines = stdout.split("\n").slice(1);
    const connected = lines.filter(line => line.includes("device") && !line.includes("offline"));
    return connected.length;
  } catch {
    return 0;
  }
}

function monitorDevices(devices, updateCallback = () => {}) {
  setInterval(async () => {
    const ips = Object.keys(devices);

    for (const ip of ips) {
      const serial = `${ip}:5555`;
      let temp = "N/A";
      let adbStatus = "❌";
      let sshStatus = "❌";

      try {
        const { stdout } = await exec(`adb devices`);
        if (stdout.includes(serial)) adbStatus = "✅";
      } catch {}

      try {
        const { stdout } = await exec(`adb -s ${serial} shell dumpsys battery`);
        const line = stdout.split("\n").find((l) => l.includes("temperature"));
        const match = line?.match(/(\d+)/);
        if (match) {
          const c = parseInt(match[1]) / 10;
          const f = (c * 9) / 5 + 32;
          temp = `${f.toFixed(1)}°F`;
        }
      } catch {}

      try {
        const { stdout } = await exec(`adb -s ${serial} shell cat /sdcard/ssh_info.txt`);
        if (stdout.includes("@")) sshStatus = "✅";
      } catch {}

      console.log(`${ip} | ${temp} | ${adbStatus} ADB | ${sshStatus} SSH`);
    }

    console.log("—".repeat(60));
  }, PING_INTERVAL);
}

module.exports = { monitorDevices };
