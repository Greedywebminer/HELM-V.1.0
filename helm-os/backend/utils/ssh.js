const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');
const adb = require('./adb');

const TMP_DIR = os.tmpdir();

/**
 * Pulls /sdcard/ssh_info.txt, replaces placeholder, and returns "user@ip"
 */
async function getSshInfo(serial) {
  const remoteFile = '/sdcard/ssh_info.txt';
  const localFile  = path.join(TMP_DIR, `ssh_info_${serial}.txt`);

  await adb.runAdb(`-s ${serial} pull ${remoteFile} ${localFile}`);

  if (!fs.existsSync(localFile)) {
    throw new Error('ssh_info.txt not found locally after pull');
  }

  let sshInfo = fs.readFileSync(localFile, 'utf8').trim();
  fs.unlinkSync(localFile);

  if (sshInfo.includes('<TO_BE_REPLACED_BY_ADB>')) {
    const ip = await adb.extractIp(serial);
    if (!ip) throw new Error('Could not resolve IP for placeholder replacement');
    sshInfo = sshInfo.replace('<TO_BE_REPLACED_BY_ADB>', ip);
  }

  return sshInfo; // e.g. "u0_a0@192.168.1.250"
}

/**
 * Opens SSH session in a new terminal window
 */
async function reconnectViaSsh(serial) {
  const info = await getSshInfo(serial);
  const cmd = `ssh -p 8022 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${info}`;

  const platform = os.platform();
  
  if (platform === 'linux') {
    spawn('gnome-terminal', ['--', 'bash', '-c', `${cmd}; exec bash`], { detached: true });
  } else if (platform === 'darwin') {
    spawn('osascript', ['-e', `tell app "Terminal" to do script "${cmd}"`], { detached: true });
  } else if (platform === 'win32') {
    spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', cmd], { detached: true });
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  console.log(`Launched SSH in new terminal for ${serial}`);
}

module.exports = { getSshInfo, reconnectViaSsh };
