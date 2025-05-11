const util = require("util");
const exec = util.promisify(require("child_process").exec);

async function safeExec(cmd) {
  try {
    const result = await exec(cmd);
    return String(result?.stdout || result || "").trim();
  } catch {
    return "";
  }
}

async function enrichDevices(devices, aliases) {
  const enriched = {};

  for (const ip in devices) {
    const serial = `${ip}:5555`;
    const alias = aliases[ip] || `miner-${ip.split(".").slice(2).join("-")}`;

    enriched[ip] = {
      ...devices[ip],
      ip,
      alias,
      temp: "N/A",
      internet: "Fail",
      adb: "Fail",
      ssh: "N/A",
      hashrate: "N/A",
    };

    // Ping
    const pingOut = await safeExec(`ping -c 1 -W 1 ${ip}`);
    if (pingOut.includes("1 received") || pingOut.includes("ttl=")) {
      enriched[ip].internet = "OK";
    }

    // ADB
    const adbOut = await safeExec(`adb devices`);
    if (adbOut.includes(serial)) {
      enriched[ip].adb = "OK";
    }

    // Temp
    const tempOut = await safeExec(`adb -s ${serial} shell dumpsys battery`);
    const tempLine = tempOut.split("\n").find((line) => line.includes("temperature"));
    const match = tempLine?.match(/(\d+)/);
    if (match) {
      const c = parseInt(match[1]) / 10;
      const f = (c * 9) / 5 + 32;
      enriched[ip].temp = `${f.toFixed(1)}°F`;
    }

    // Hashrate
    const hashOut = await safeExec(`adb -s ${serial} shell tail -n 10 /sdcard/miner.log`);
    const hashMatch = hashOut.match(/([0-9.]+)\s*(KH\/s|MH\/s|H\/s)/i);
    if (hashMatch) {
      enriched[ip].hashrate = `${hashMatch[1]} ${hashMatch[2]}`;
    }

    // SSH info (explicit parse to string)
    try {
      const { stdout } = await exec(`adb -s ${serial} shell cat /sdcard/ssh_info.txt`);
      enriched[ip].ssh = stdout.trim();
    } catch {
      enriched[ip].ssh = "N/A";
    }

   
  }

  return enriched;
}

module.exports = { enrichDevices };
