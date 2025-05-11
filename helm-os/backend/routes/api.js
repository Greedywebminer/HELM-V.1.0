const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { exec, execSync } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);

const { installAll, uninstallAll, installSingle, uninstallSingle, APK_MAP } = require("../utils/apkInstaller");
const { switchPoolViaSSH } = require("../utils/poolSwitcher");
const { runAdb } = require("../utils/adb");
const { sshReconnect } = require("../utils/sshInfo");
const { restartTermuxAll, restartTermuxSelected } = require("../utils/termuxRestarter");
const { runLimited, wrapAsync } = require("../utils/queue");
const { enrichDevices } = require("../utils/enricher");

const DEVICES_FILE = path.resolve(__dirname, "../data/devices.json");
const ALIAS_FILE = path.resolve(__dirname, "../data/device_aliases.json");

function loadDevices() {
  const data = fs.existsSync(DEVICES_FILE) ? JSON.parse(fs.readFileSync(DEVICES_FILE)) : {};
  const cleaned = {};
  for (const ip in data) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
      cleaned[ip] = data[ip];
    } else {
      console.warn(`[loadDevices] Skipping invalid IP: ${ip}`);
    }
  }
  return cleaned;
}

function loadAliases() {
  return fs.existsSync(ALIAS_FILE) ? JSON.parse(fs.readFileSync(ALIAS_FILE)) : {};
}

function saveAliases(data) {
  fs.writeFileSync(ALIAS_FILE, JSON.stringify(data, null, 2));
}

router.get("/apk-list", (req, res) => {
  const list = Object.entries(APK_MAP).map(([key, value]) => ({
    ...value,
    key,
  }));
  res.json(list);
});

router.get("/devices", (req, res) => {
  const db = loadDevices();
  res.json(db);
});

router.post("/devices/rename", (req, res) => {
  const { ip, alias } = req.body;
  if (!ip || !alias) return res.status(400).json({ error: "Missing IP or alias" });
  const aliases = loadAliases();
  aliases[ip] = alias;
  saveAliases(aliases);
  res.json({ status: "Alias updated" });
});

router.get("/devices/enriched", async (req, res) => {
  console.log("🔥 ENRICHED ENDPOINT CALLED");

  const devices = loadDevices();
  const aliases = loadAliases();

  const enriched = await enrichDevices(devices, aliases);

  console.log("\n📊 Enriched Summary:");
  for (const ip in enriched) {
    const dev = enriched[ip];
    const temp = dev.temp || "N/A";
    const adb = dev.adb === "OK" ? "✅" : "❌";
    const ssh = dev.ssh && dev.ssh !== "N/A" ? "✅" : "❌";
    console.log(`${ip.padEnd(15)} | ${temp.padEnd(7)} | ${adb} ADB | ${ssh} SSH`);
  }
  console.log("-".repeat(60));

  res.json(enriched); // ✅ send enriched response to frontend
});

router.post("/apk-install-selected", wrapAsync(async (req, res) => {
  const { apk, ips } = req.body;
  if (!apk || !Array.isArray(ips) || ips.length === 0) {
    return res.status(400).json({ error: "Missing apk or ips" });
  }

  const results = [];
  let done = 0;
  const total = ips.length;

  for (const ip of ips) {
    try {
      const msg = await runLimited(() => installSingle(`${ip}:5555`, apk));
      results.push({ ip, status: "success", message: msg });
    } catch (err) {
      console.warn(`[${ip}] ❌ Failed install: ${err.message}`);
      results.push({ ip, status: "error", message: err.message });
    }
    done++;
    results.push({ ip, progress: `${Math.round((done / total) * 100)}%` });
  }

  res.json({ status: `Installed ${apk} on ${ips.length} devices`, results });
}));

router.post("/apk-install/:ip/:apk", wrapAsync(async (req, res) => {
  const msg = await runLimited(() => installSingle(req.params.ip, req.params.apk));
  res.json({ status: msg });
}));

router.post("/apk-uninstall/:ip/:apk", wrapAsync(async (req, res) => {
  const msg = await runLimited(() => uninstallSingle(req.params.ip, req.params.apk));
  res.json({ status: msg });
}));

router.post("/apk-install-all", wrapAsync(async (req, res) => {
  const db = loadDevices();
  for (const ip of Object.keys(db)) await runLimited(() => installAll(ip));
  res.json({ status: "All APKs installed" });
}));

router.post("/apk-uninstall-selected", wrapAsync(async (req, res) => {
  const { apk, ips } = req.body;
  if (!apk || !Array.isArray(ips) || ips.length === 0) {
    return res.status(400).json({ error: "Missing apk or ips" });
  }

  const results = [];
  let done = 0;
  const total = ips.length;

  for (const ip of ips) {
    try {
      const msg = await runLimited(() => uninstallSingle(`${ip}:5555`, apk));
      results.push({ ip, status: "success", message: msg });
    } catch (err) {
      console.warn(`[${ip}] ❌ Failed uninstall: ${err.message}`);
      results.push({ ip, status: "error", message: err.message });
    }
    done++;
    results.push({ ip, progress: `${Math.round((done / total) * 100)}%` });
  }

  res.json({ status: `Tried to uninstall ${apk} from ${ips.length} devices`, results });
}));

router.post("/apk-uninstall-all-selected", wrapAsync(async (req, res) => {
  const { ips } = req.body;
  if (!Array.isArray(ips) || ips.length === 0) {
    return res.status(400).json({ error: "No IPs provided" });
  }

  const results = [];
  let done = 0;
  const total = ips.length;

  for (const ip of ips) {
    const serial = `${ip}:5555`;
    try {
      const uninstallResults = await runLimited(() => uninstallAll(ip));
      results.push(...uninstallResults);
    } catch (err) {
      results.push({ ip, status: "error", message: err.message });
    }
    done++;
    results.push({ ip, progress: `${Math.round((done / total) * 100)}%` });
  }

  res.json({ status: `Uninstalled all APKs from ${ips.length} devices.`, logs: results });
}));

// Launch scrcpy
router.post("/devices/:serial/scrcpy", wrapAsync(async (req, res) => {
  const { serial } = req.params;
  try {
    execSync(`scrcpy -s ${serial}`, { stdio: 'ignore' });
    res.json({ status: 'Scrcpy launched' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}));

// Setup miner
router.post("/devices/:serial/miner/setup", wrapAsync(async (req, res) => {
  const { serial } = req.params;
  const script = path.resolve(__dirname, "../scripts/miner-setup.sh");

  try {
    execSync(`adb -s ${serial} push \"${script}\" /sdcard/miner-setup.sh`);
    execSync(`adb -s ${serial} shell sh /sdcard/miner-setup.sh`);
    res.json({ status: 'Miner setup complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}));

router.post("/pool/switch", wrapAsync(async (req, res) => {
  const { ips, pool } = req.body;
  if (!Array.isArray(ips) || !pool) {
    return res.status(400).json({ error: "Missing ips or pool" });
  }

  const aliases = loadAliases();
  const logs = [];

  for (const ip of ips) {
    const alias = aliases[ip] || `miner-${ip.split(".").slice(-2).join("-")}`;
    await runLimited(() =>
      switchPoolViaSSH(ip, alias, pool, (msg) =>
        logs.push(`[${alias}] ${msg}`)
      )
    );
  }

  res.json({ status: `✅ Switched pool for ${ips.length} devices`, logs });
}));


module.exports = router;
