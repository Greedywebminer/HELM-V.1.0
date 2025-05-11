const util = require("util");
const { execFile, execSync } = require("child_process");
const execAsync = util.promisify(execFile);
const { reconnectSSH } = require("./ssh");

const execOptions = { timeout: 10000 };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run(cmd) {
  try {
    const [cmdName, ...args] = cmd.split(" ");
    const { stdout } = await execAsync(cmdName, args, execOptions);
    return stdout.trim();
  } catch (err) {
    console.warn(`[exec error] ${cmd}: ${err.message}`);
    return null;
  }
}

async function reconnectWirelessAdb(serial) {
  console.log(`↩️ Reconnecting ${serial}...`);
  try {
    execSync(`adb -s ${serial} tcpip 5555`);
    await sleep(1500);
    execSync(`adb connect ${serial}`);
    console.log(`✅ [ADB Reconnect] ${serial} successful`);
  } catch (err) {
    console.warn(`❌ [ADB Reconnect Failed] ${serial}: ${err.message}`);
    console.log(`🛠️ Attempting fullRecovery for ${serial}...`);
    await fullRecovery(serial);
  }
}

async function getDeviceIP(serial) {
  const output = await run(`adb -s ${serial} shell ip -f inet addr show wlan0`);
  if (!output) return null;

  const match = output.match(/inet (\d+\.\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

async function ping(ip) {
  const result = await run(`ping -c 1 -W 10 ${ip}`);
  return result && result.includes("ttl=");
}

async function reconnectADB(ip, serial) {
  await run(`adb -s ${serial} tcpip 5555`);
  await sleep(2000);

  const newIP = await getDeviceIP(serial);
  if (!newIP) {
    console.warn(`[${serial}] No IP after Wi-Fi toggle`);
    return false;
  }

  const reachable = await ping(newIP);
  if (!reachable) {
    console.warn(`[${serial}] Ping failed to ${newIP}`);
    return false;
  }

  const connectResult = await run(`adb connect ${newIP}:5555`);
  return connectResult && connectResult.includes("connected");
}

async function fullRecovery(serial) {
  console.log(`[RECOVERY] Starting for ${serial}`);

  let ip = await getDeviceIP(serial);
  if (!ip) {
    console.warn(`[${serial}] Could not get IP.`);
    return false;
  }

  const reachable = await ping(ip);
  if (reachable) {
    console.log(`[${serial}] IP reachable: ${ip}`);
    return true;
  }

  console.log(`[${serial}] Attempting ADB reconnect...`);
  await run(`adb -s ${serial} reconnect`);
  await sleep(2000);

  ip = await getDeviceIP(serial);
  if (ip && await ping(ip)) {
    console.log(`[${serial}] Recovered after ADB reconnect`);
    return true;
  }

  console.log(`[${serial}] Trying ADB reboot...`);
  await run(`adb -s ${serial} reboot`);
  await sleep(60000); // wait 1 min for reboot

  ip = await getDeviceIP(serial);
  if (ip && await ping(ip)) {
    console.log(`[${serial}] Back online after reboot`);
    return true;
  }

  console.log(`[${serial}] Attempting SSH fallback...`);
  return await reconnectSSH(serial);
}

module.exports = {
  reconnectWirelessAdb,
  fullRecovery,
  reconnectADB,
  getDeviceIP,
  ping,
};
