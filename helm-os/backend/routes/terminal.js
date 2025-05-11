// === backend/sockets/terminal.js ===
const pty = require("node-pty");
const { getSshInfo } = require("../utils/sshInfo");

module.exports = function attachSSHNamespace(io) {
  io.of("/ssh").on("connection", async (socket) => {
    const ip = socket.handshake.query.ip;

    if (!ip) {
      console.warn("[SSH] No IP provided in handshake.");
      return socket.disconnect(true);
    }

    console.log(`[SSH] Client connected for ${ip}`);

    let sshTarget;
   // backend/utils/sshInfo.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const adb = require('./adb');

const TMP_DIR = os.tmpdir();

/**
 * Pulls /sdcard/ssh_info.txt, replaces placeholder, and returns "user@ip"
 */
async function getSshInfo(serial) {
  const remoteFile = '/sdcard/ssh_info.txt';
  const localFile  = path.join(TMP_DIR, `ssh_info_${serial}.txt`);

  // 1) Pull the file
  await adb.runAdb(`-s ${serial} pull ${remoteFile} ${localFile}`);

  if (!fs.existsSync(localFile)) {
    throw new Error('ssh_info.txt not found locally after pull');
  }

  // 2) Read and clean up
  let sshInfo = fs.readFileSync(localFile, 'utf8').trim();
  fs.unlinkSync(localFile);

  // 3) Replace placeholder with actual IP if needed
  if (sshInfo.includes('<TO_BE_REPLACED_BY_ADB>')) {
    const ip = await adb.extractIp(serial);
    if (!ip) throw new Error('Could not resolve IP for placeholder replacement');
    sshInfo = sshInfo.replace('<TO_BE_REPLACED_BY_ADB>', ip);
  }

  return sshInfo; // e.g. "u0_a0@192.168.1.250"
}

/**
 * Issues SSH reboot via the pulled ssh_info
 */
const { spawn } = require('child_process');

async function reconnectViaSsh(serial) {
  const info = await getSshInfo(serial);
  // Launch an interactive SSH session, just like 147.py
 const ssh = spawn('ssh', [
  '-o', 'StrictHostKeyChecking=no',
  '-o', 'UserKnownHostsFile=/dev/null',
  '-p', '8022',
  info
], {
  stdio: 'inherit',
  shell: false
});


  ssh.on('exit', code => {
    console.log(`SSH session exited with code ${code}`);
  });
}

module.exports = { getSshInfo, reconnectViaSsh };

        name: "xterm-color",
        cols: 80,
        rows: 24,
        cwd: process.env.HOME,
        env: process.env
      });
    } catch (err) {
      console.error(`[SSH] Failed to start PTY for ${ip}:`, err);
      return socket.disconnect(true);
    }

    // Pipe SSH output to frontend
    term.on("data", (data) => {
      socket.emit("data", data);
    });

    // Receive input from frontend
    socket.on("input", (data) => {
      term.write(data);
    });

    // Handle terminal exit
    term.on("exit", (code, signal) => {
      console.log(`[SSH] PTY exited for ${ip} with code=${code}, signal=${signal}`);
    });

    // Handle frontend disconnect
    socket.on("disconnect", () => {
      console.log(`[SSH] Session closed for ${ip}`);
      term.kill();
    });
  });
};
