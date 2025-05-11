const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const execAsync = util.promisify(exec);
const { runSetupScript } = require('../utils/setupService');



const { runLimited, wrapAsync } = require("../utils/queue");

const ADB = '~/Desktop/platform-tools/adb';
const SETUP_SCRIPT = '~/Desktop/Setup/setup.sh';
const CUSTOM_SCRIPT = '~/Desktop/Setup/custom.sh';
const ADB_CLEANUP = '~/Desktop/Setup/adb_cleanup.sh';

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(stderr || err.message);
      else resolve(stdout.trim());
    });
  });
}


// Add this route
router.get("/api/ssh/reconnect/:ip", async (req, res) => {
  const ip = req.params.ip;

  // Return a command string to execute in terminal
  return res.json({
    status: "Ready",
    command: "sshd && echo '✅ SSH restarted on Termux'",
  });
});
router.post('/devices/rename', wrapAsync(async (req, res) => {
  const { ip, alias } = req.body;
  if (!ip || !alias) throw new Error("Missing ip or alias");

  const file = path.resolve('/home/helm/Desktop/Setup/device_ips.txt');
  let lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n') : [];

  lines = lines.filter(line => !line.includes(ip));
  lines.push(`${alias} ${ip}`);
  fs.writeFileSync(file, lines.join('\n'));
  res.json({ message: `Alias set to ${alias}` });
}));

router.post('/reboot', wrapAsync(async (req, res) => {
  const { ip } = req.body;
  await runLimited(() => runCommand(`adb connect ${ip}:5555 && adb -s ${ip}:5555 reboot`));
  res.json({ message: 'Rebooted' });
}));

router.post("/setup-multi", async (req, res) => {
  const { ips } = req.body;
  if (!Array.isArray(ips)) return res.status(400).send("Missing IPs");

  for (const ip of ips) {
    const serial = `${ip}:5555`;
    runSetupScript(serial).catch((err) => {
      console.error(`❌ Setup failed for ${ip}: ${err.message}`);
    });
  }

  res.send({ status: "Setup triggered for all devices." });
});

router.post('/ssh/reconnect/:ip', wrapAsync(async (req, res) => {
  const { ip } = req.params;
  const serial = `${ip}:5555`;

  try {
    const { reconnectViaSsh } = require("../utils/sshInfo");
    await reconnectViaSsh(serial);
    res.json({ message: `Launched SSH terminal for ${serial}` });
  } catch (err) {
    console.error(`[SSH ERROR] ${err.message}`);
    res.status(500).json({ error: `SSH connect failed: ${err.message}` });
  }
}));

router.post('/scrcpy', wrapAsync(async (req, res) => {
  const { ip } = req.body;
  await runLimited(() => runCommand(`scrcpy -s ${ip}:5555 --no-audio --max-fps 30 --window-borderless`));
  res.json({ message: 'Scrcpy Launched' });
}));

router.post('/termux/restart/:ip', wrapAsync(async (req, res) => {
  const { ip } = req.params;
  await runLimited(() => runCommand(`adb -s ${ip}:5555 shell 'am force-stop com.termux && sleep 1 && am start -n com.termux/.app.TermuxActivity'`));
  res.json({ message: 'Termux Restarted' });
}));

router.post("/run-script/:ip", wrapAsync(async (req, res) => {
  const { ip } = req.params;
  const serial = `${ip}:5555`;
  const logs = [];

  await runLimited(async () => {
    await runSetupScript(serial, (msg) => logs.push(msg));
  });

  res.json({ logs, status: "✅ Setup Completed" });
}));

router.post("/setup", async (req, res) => {
  const { serial } = req.body;
  if (!serial) return res.status(400).send("Missing serial");

  try {
    await runSetupScript(serial);
    res.json({ status: "✅ Setup triggered" });
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Setup failed");
  }
});
router.post('/debloat', wrapAsync(async (req, res) => {
  const { ip } = req.body;
  await runLimited(() => runCommand(`adb -s ${ip}:5555 shell pm uninstall --user 0 com.facebook.katana`));
  res.json({ message: 'Debloated (example only)' });
}));

router.post('/adb-cleanup', wrapAsync(async (req, res) => {
  await runLimited(() => runCommand(`bash ${ADB_CLEANUP}`));
  res.json({ message: 'ADB Cleanup Done' });
}));

module.exports = router;
