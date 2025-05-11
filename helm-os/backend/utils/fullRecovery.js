const util = require("util");
const { exec } = require("child_process");
const execAsync = util.promisify(exec);
const { reconnectSSH } = require("./ssh");

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run(cmd) {
  try {
    const { stdout } = await execAsync(cmd);
    return stdout.trim();
  } catch (err) {
    console.warn(`[exec error] ${cmd}: ${err.message}`);
    return null;
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

async function fullRecovery(serial) {
  console.log(`[RECOVERY] Starting for ${serial}`);

  let ip = await getDeviceIP(serial);
  if (!ip) {
    console.warn(`[${serial}] Could not get IP`);
    return false;
  }

  if (await ping(ip)) {
    console.log(`[${serial}] IP reachable: ${ip}`);
    return true;
  }

  console.log(`[${serial}] Trying ADB reconnect...`);
  await run(`adb -s ${serial} reconnect`);
  await sleep(2000);

  ip = await getDeviceIP(serial);
  if (ip && await ping(ip)) {
    console.log(`[${serial}] Recovered after ADB reconnect`);
    return true;
  }

  console.log(`[${serial}] Trying ADB reboot...`);
  await run(`adb -s ${serial} reboot`);
  await sleep(60000); // wait for reboot

  ip = await getDeviceIP(serial);
  if (ip && await ping(ip)) {
    console.log(`[${serial}] Back online after ADB reboot`);
    return true;
  }

  console.log(`[${serial}] Trying SSH fallback...`);
  return await reconnectSSH(serial);
}

module.exports = { fullRecovery };
