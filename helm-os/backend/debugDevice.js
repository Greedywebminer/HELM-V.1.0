const util = require("util");
const exec = util.promisify(require("child_process").exec);

const ip = "192.168.202.106";
const serial = `${ip}:5555`;

(async () => {
  console.log(`🔍 Testing ${ip}...\n`);

  // Ping
  try {
    const { stdout } = await exec(`ping -c 1 -W 1 ${ip}`);
    if (stdout.includes("1 received") || stdout.includes("ttl=")) {
      console.log("🌐 Ping: ✅ OK");
    } else {
      console.log("🌐 Ping: ❌ Failed");
    }
  } catch (err) {
    console.log("🌐 Ping error:", err.message);
  }

  // ADB connect
  try {
    const { stdout } = await exec(`adb connect ${serial}`);
    console.log("🔌 ADB Connect:", stdout.trim());
  } catch (err) {
    console.log("🔌 ADB Connect error:", err.message);
  }

  // ADB devices
  try {
    const { stdout } = await exec(`adb devices`);
    console.log("🔍 ADB Devices:\n", stdout);
  } catch (err) {
    console.log("🔍 ADB Devices error:", err.message);
  }

  // ADB shell test
  try {
    const { stdout } = await exec(`adb -s ${serial} shell 'echo HELLO'`);
    console.log("📟 ADB Shell Response:", stdout.trim());
  } catch (err) {
    console.log("📟 ADB Shell error:", err.message);
  }

  // Temperature
  try {
    const { stdout } = await exec(`adb -s ${serial} shell dumpsys battery`);
    const line = stdout.split("\n").find(line => line.includes("temperature"));
    if (line) {
      const match = line.match(/(\d+)/);
      const c = parseInt(match[1]) / 10;
      const f = (c * 9) / 5 + 32;
      console.log(`🌡 Temp: ${f.toFixed(1)}°F`);
    } else {
      console.log("🌡 Temp: Not found");
    }
  } catch (err) {
    console.log("🌡 Temp error:", err.message);
  }

  // Miner log
  try {
    const { stdout } = await exec(`adb -s ${serial} shell tail -n 10 /sdcard/miner.log`);
    console.log("⛏ Hashrate:\n", stdout);
  } catch (err) {
    console.log("⛏ Hashrate error:", err.message);
  }

  // SSH info
  try {
    const { stdout } = await exec(`adb -s ${serial} shell cat /sdcard/ssh_info.txt`);
    console.log("🔐 SSH Info:", stdout.trim());
  } catch (err) {
    console.log("🔐 SSH Info error:", err.message);
  }
})();
