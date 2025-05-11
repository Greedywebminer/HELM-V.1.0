const { exec } = require("child_process");
const util = require("util");
const fs = require("fs");
const execAsync = util.promisify(exec);

const SETUP_SRC = "/home/helm/Desktop/Setup/setup.sh";
const SETUP_DST = "/sdcard/setup.sh";
const HOME = "$HOME"; // Termux home in ADB context

function runCommand(cmd) {
  return execAsync(cmd).then(res => res.stdout.trim());
}

async function setupAlreadyDone(serial) {
  try {
    const { stdout } = await execAsync(`adb -s ${serial} shell ls ${SETUP_DST}`);
    return stdout.includes("setup.sh");
  } catch {
    return false;
  }
}

async function pushSetupScript(serial) {
  if (!fs.existsSync(SETUP_SRC)) {
    throw new Error(`setup.sh not found at ${SETUP_SRC}`);
  }

  const alreadyDone = await setupAlreadyDone(serial);
  if (alreadyDone) {
    console.log(`[SETUP] Skipping push: setup.sh already on ${serial}`);
    return;
  }

  try {
    await execAsync(`adb -s ${serial} push "${SETUP_SRC}" ${SETUP_DST}`);
    await execAsync(`adb -s ${serial} shell chmod +x ${SETUP_DST}`);
  } catch (err) {
    throw new Error(`pushSetupScript failed: ${err.message}`);
  }
}

async function runSetupScript(serial, logFn = console.log) {
  const log = (msg) => {
    const full = `[${serial}] ${msg}`;
    logFn(full); // <-- send to log panel
    console.log(full); // still console log too
  };

  log("📂 Running setup.sh...");

  log("🔄 Restarting Termux...");
  await execAsync(`adb -s ${serial} shell am start -n com.termux/.app.TermuxActivity`);
  await new Promise(resolve => setTimeout(resolve, 8000));

  log("🔄 Force stopping and restarting Termux...");
  await execAsync(`adb -s ${serial} shell am force-stop com.termux`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await execAsync(`adb -s ${serial} shell am start -n com.termux/.app.TermuxActivity`);
  await new Promise(resolve => setTimeout(resolve, 5000));

  log("🧠 Running termux-setup-storage...");
  await execAsync(`adb -s ${serial} shell input text 'termux-setup-storage'`);
  await execAsync(`adb -s ${serial} shell input keyevent 66`);
  await new Promise(resolve => setTimeout(resolve, 8000));

  log("🔄 Restarting Termux...");
  await execAsync(`adb -s ${serial} shell am start -n com.termux/.app.TermuxActivity`);
  await new Promise(resolve => setTimeout(resolve, 5000));

  log("▶ Simulating 'bash /sdcard/setup.sh'...");
  await execAsync(`adb -s ${serial} shell input text 'bash\\ /sdcard/setup.sh'`);
  await execAsync(`adb -s ${serial} shell input keyevent 66`);

 log("⏳ Waiting for SSH info...");
await new Promise(resolve => setTimeout(resolve, 10000));

// Try to fetch SSH info from /sdcard/ssh_info.txt (preferred)
let sshInfo = "";
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    sshInfo = await runCommand(`adb -s ${serial} shell cat /sdcard/ssh_info.txt`);
    sshInfo = sshInfo.trim();
    if (sshInfo) {
      log(`🔗 SSH Ready: ssh -p 8022 ${sshInfo}`);
      break;
    } else {
      log(`⚠️ Attempt ${attempt}: ssh_info.txt is empty`);
    }
  } catch (err) {
    log(`❌ Attempt ${attempt}: Failed to read ssh_info.txt — ${err.message}`);
  }
  if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 3000));
}

// Fallback to legacy HOME/ssh_user.txt and ip.txt
if (!sshInfo) {
  try {
    const user = await runCommand(`adb -s ${serial} shell "cat ${HOME}/ssh_user.txt"`);
    const ip = await runCommand(`adb -s ${serial} shell "cat ${HOME}/ip.txt"`);
    if (user && ip) {
      log(`🔗 SSH Ready: ssh -p 8022 ${user}@${ip}`);
    } else {
      log("❌ Could not fetch fallback SSH credentials");
    }
  } catch {
    log("❌ Could not fetch fallback SSH credentials");
  }
}

  log("✅ Setup Completed");
}

module.exports = {
  pushSetupScript,
  runSetupScript,
  setupAlreadyDone
};
