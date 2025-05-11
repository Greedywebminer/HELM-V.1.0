const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn, execFileSync } = require('child_process');
const adb = require('./adb');

const SSH_PUB = path.join(os.homedir(), '.ssh', 'id_rsa.pub');
const SSH_KEY = path.join(os.homedir(), '.ssh', 'id_rsa');

async function ensureSshKeyExists() {
  if (!fs.existsSync(SSH_PUB)) {
    console.log('🔐 Generating SSH key...');
    execSync(`ssh-keygen -t rsa -f ${SSH_KEY} -q -N ""`, { stdio: 'inherit' });
  }
}

async function pushSshKey(serial) {
  await ensureSshKeyExists();
  await adb.runAdb(`-s ${serial} push ${SSH_PUB} /sdcard/id_rsa.pub`);
  await adb.runAdb(`-s ${serial} shell mkdir -p ~/.ssh`);
  await adb.runAdb(`-s ${serial} shell 'cat /sdcard/id_rsa.pub >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'`);
}

async function installOpenSsh(serial) {
  await adb.runAdb(`-s ${serial} shell 'yes | pkg install openssh -y'`);
  await adb.runAdb(`-s ${serial} shell 'pgrep -x sshd >/dev/null || sshd'`);
}

async function getSshInfo(serial) {
  const localFile = path.join(os.tmpdir(), `ssh_info_${serial}.txt`);
  await adb.runAdb(`-s ${serial} pull /sdcard/ssh_info.txt ${localFile}`);
  if (!fs.existsSync(localFile)) throw new Error('ssh_info.txt missing');

  let info = fs.readFileSync(localFile, 'utf8').trim();
  fs.unlinkSync(localFile);

  if (info.includes('<TO_BE_REPLACED_BY_ADB>')) {
    const ip = await adb.extractIp(serial);
    if (!ip) throw new Error('Unable to resolve IP');
    info = info.replace('<TO_BE_REPLACED_BY_ADB>', ip);
  }

  return info; // e.g. u0_a344@192.168.1.250
}

function launchTerminalWithCmd(userAtIp) {
  const termOrder = ['xfce4-terminal', 'gnome-terminal', 'konsole', 'xterm'];
  const sshCmd = `echo '[DEBUG] Final SSH info: ${userAtIp}'; exec ssh -p 8022 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${userAtIp}`;

  for (const term of termOrder) {
    try {
      execSync(`which ${term}`, { stdio: 'ignore' });

      if (term === 'xfce4-terminal') {
        spawn(term, ['--command', `bash -c "${sshCmd}"`], { detached: true });
      } else if (term === 'gnome-terminal') {
        spawn(term, ['--', 'bash', '-c', sshCmd], { detached: true });
      } else if (term === 'konsole') {
        spawn(term, ['-e', `bash -c "${sshCmd}"`], { detached: true });
      } else if (term === 'xterm') {
        spawn(term, ['-e', sshCmd], { detached: true });
      }

      console.log(`🖥️ Launched terminal with SSH to ${userAtIp}`);
      return;
    } catch {
      // terminal not found, try next
    }
  }

  throw new Error('❌ No supported terminal emulator found');
}

async function reconnectViaSsh(serial) {
  try {
    await installOpenSsh(serial);
    await pushSshKey(serial);
    const userAtIp = await getSshInfo(serial);
    launchTerminalWithCmd(userAtIp);
  } catch (err) {
    console.error(`❌ SSH reconnect failed: ${err.message}`);
  }
}

module.exports = { reconnectViaSsh };
