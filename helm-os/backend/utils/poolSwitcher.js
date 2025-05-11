// utils/poolSwitcher.js - Full pool switch logic via SSH with jq update

const util = require("util");
const exec = util.promisify(require("child_process").exec);
const execAsync = exec;  // alias for consistency

const wallet = "RQaWTAGYudd2sPnXy9vqVj8qd7VXLRP5ep";

// === Function 1: Preferred SSH-based switch using jq + config.json update
async function switchPoolViaSSH(ip, alias, poolName, log = console.log) {
  const ssh = `ssh -p 8022 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${alias}@${ip}`;
  try {
    log(`[${alias}] Connecting via SSH…`);

    // Stop miner
    await exec(`${ssh} 'pkill -f ccminer'`);

    // Find config.json
    const { stdout: configPathRaw } = await exec(`${ssh} 'find ~ -name config.json -print -quit'`);
    const configPath = configPathRaw.trim();
    if (!configPath.endsWith(".json")) {
      log(`[${alias}] ❌ config.json not found`);
      return;
    }

    // Clean `.url`, update pool and user fields
    await exec(`${ssh} 'cp ${configPath} ${configPath}.bak && jq "del(.url)" ${configPath} > ~/config_clean.json && mv ~/config_clean.json ${configPath}'`);
    await exec(`${ssh} 'jq ".pools |= map(if .name == \\"${poolName}\\" then .disabled = 0 else .disabled = 1 end)" ${configPath} > ~/tmp_pool.json'`);
    await exec(`${ssh} 'jq ".user = \\"${wallet}.${alias}\\"" ~/tmp_pool.json > ~/config_tmp.json && mv ~/config_tmp.json ${configPath} && rm ~/tmp_pool.json'`);

    // Save status
    await exec(`${ssh} 'echo "${poolName}" > ~/pool_status.txt'`);
    log(`[${alias}] ✅ Pool set to ${poolName}`);

    // ADB fallback Termux restart
    await exec(`adb connect ${ip}:5555`);
    await exec(`adb -s ${ip}:5555 shell am force-stop com.termux`);
    await exec(`adb -s ${ip}:5555 shell am start -n com.termux/.app.TermuxActivity`);
    log(`[${alias}] ♻ Termux restarted via ADB`);
  } catch (err) {
    log(`[${alias}] ❌ Error: ${err.message}`);
  }
}

// === Function 2: Basic inline pool switch using hardcoded sshUser and static config path
async function switchPoolForDevice(ip, poolName) {
  const poolMap = {
    "NA-LUCKPOOL": { user: "wallet.worker", url: "stratum+tcp://na.luckpool.net:3956" },
    "USW-VIPOR": { user: "wallet.worker", url: "stratum+tcp://vipor.net:3052" },
    "AIH-LOW": { user: "wallet.worker", url: "stratum+tcp://aih.mine:3033" },
    "WW-ZERGPOOL": { user: "wallet.worker", url: "stratum+tcp://zergpool.com:3535" },
  };

  if (!poolMap[poolName]) throw new Error("Invalid pool name");
  const { user, url } = poolMap[poolName];

  const sshUser = `u0_a121`; // Replace if dynamic or pulled from ssh_info
  const sshPort = 8022;
  const configPath = "/data/data/com.termux/files/home/config.json";

  const cmd = [
    `ssh -p ${sshPort} -o ConnectTimeout=3 ${sshUser}@${ip}`,
    `"jq '(.pools[0].url = \\"${url}\\") | (.pools[0].user = \\"${user}\\")' ${configPath} > tmp.json && mv tmp.json ${configPath} && pkill -f ccminer"`
  ].join(" ");

  try {
    await execAsync(cmd);
    console.log(`[POOL] ${ip} ➜ ${poolName}`);
  } catch (err) {
    console.error(`[POOL FAIL] ${ip} ➜ ${poolName}`, err.message);
    throw err;
  }
}

// === Export both
module.exports = {
  switchPoolViaSSH,
  switchPoolForDevice
};
