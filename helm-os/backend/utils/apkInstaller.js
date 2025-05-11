const fs = require("fs");
const path = require("path");
const { runAdb } = require("./adb");

const APK_DIR = path.resolve(__dirname, "../apks");

const APK_MAP = {
  termux:      { name: "Termux",      file: "com.termux_1021.apk",           pkg: "com.termux" },
  termux_api:  { name: "Termux API",  file: "com.termux.api_1000.apk",       pkg: "com.termux.api" },
  termux_boot: { name: "Termux Boot", file: "com.termux.boot_1000.apk",      pkg: "com.termux.boot" },
  boot:        { name: "Boot Apps",   file: "boot.apk",                      pkg: "com.argonremote.launchonboot" },
  acurast:     { name: "Acurast",     file: "acurast.apk",                   pkg: "com.acurast.attested.executor.sbs.canary" },
  nodle:       { name: "Nodle Cash",  file: "nodle.apk",                     pkg: "io.nodle.cash" },
};

function resolveApk(key) {
  const match = Object.entries(APK_MAP).find(([k, e]) =>
    k === key || e.pkg === key || e.file === key || e.name === key
  );
  if (!match) console.warn(`❌ resolveApk(): No match found for "${key}"`);
  return match ? match[1] : null;
}

async function installSingle(serial, key) {
  const apk = resolveApk(key);
  if (!apk) throw new Error(`APK not found for: ${key}`);
  const { name, file, pkg } = apk;

  const local = path.join(APK_DIR, file);
  if (!fs.existsSync(local)) throw new Error(`APK not found: ${local}`);
  const installed = await runAdb(`-s ${serial} shell pm list packages`);
  if (installed.includes(pkg)) return `${name} already installed`;

  await runAdb(`-s ${serial} push "${local}" /data/local/tmp/${file}`);
  const out = await runAdb(`-s ${serial} shell pm install -r /data/local/tmp/${file}`);
  await runAdb(`-s ${serial} shell rm /data/local/tmp/${file}`);
  return `${name}: ${out.trim()}`;
}

async function uninstallSingle(serial, key) {
  const apk = resolveApk(key);
  if (!apk) return `[${serial.split(":"[0])}] Failed to uninstall ${key}: APK not found`;
  const { pkg } = apk;

  try {
    const installed = await runAdb(`-s ${serial} shell pm list packages`);
    if (!installed.includes(pkg)) return `[${serial.split(":"[0])}] ${pkg} not installed`;

    const out = await runAdb(`-s ${serial} shell pm uninstall ${pkg}`);
    return `[${serial.split(":"[0])}] Uninstalled ${pkg}: ${out.trim()}`;
  } catch (err) {
    return `[${serial.split(":"[0])}] Failed to uninstall ${pkg}: ${err.message}`;
  }
}

async function installAll(serial) {
  const logs = [];
  const ip = serial.split(":")[0];
  let success = 0;
  let fail = 0;
  let skipped = 0;

  try {
    await runAdb(`connect ${serial}`);
  } catch {
    await new Promise(r => setTimeout(r, 300));
    try {
      await runAdb(`connect ${serial}`);
    } catch (err) {
      logs.push(`[${serial}] ❌ ADB connect failed: ${err.message}`);
      return logs;
    }
  }

  let installedPackages = "";
  try {
    installedPackages = await runAdb(`-s ${serial} shell pm list packages`);
  } catch (err) {
    logs.push(`[${serial}] ❌ Failed to list packages: ${err.message}`);
    return logs;
  }

  const tasks = Object.entries(APK_MAP).map(async ([key, { file, pkg }]) => {
    const local = path.join(APK_DIR, file);
    try {
      if (!fs.existsSync(local)) {
        fail++;
        return `[${serial}] ❌ APK not found: ${local}`;
      }

      if (installedPackages.includes(pkg)) {
        skipped++;
        return `[${serial}] ✅ ${pkg} already installed`;
      }

      await runAdb(`-s ${serial} push "${local}" /data/local/tmp/${file}`);
      const out = await runAdb(`-s ${serial} shell pm install -r /data/local/tmp/${file}`);
      await runAdb(`-s ${serial} shell rm /data/local/tmp/${file}`);

      success++;
      return `[${serial}] 📦 Installed ${pkg}: ${out.trim()}`;
    } catch (err) {
      fail++;
      return `[${serial}] ❌ Failed to install ${pkg}: ${err.message}`;
    }
  });

  const results = await Promise.allSettled(tasks);
  const messages = results.map(r => r.value || `❌ ${r.reason}`);
  const total = Object.keys(APK_MAP).length;
  const percent = Math.round((success / total) * 100);

  messages.push(`[${serial}] ✅ Done: ${success} success, ${fail} failed, ${skipped} skipped (${percent}%)`);
  return messages;
}

async function installAllSelected(ips) {
  const logs = [];
  for (const ip of ips) {
    const serial = `${ip}:5555`;
    const results = await installAll(serial);
    logs.push(...results);
  }
  return logs;
}

async function uninstallAll(ip) {
  const serial = `${ip}:5555`;
  const logs = [];

  for (const [key, { pkg }] of Object.entries(APK_MAP)) {
    try {
      const installed = await runAdb(`-s ${serial} shell pm list packages`);
      if (!installed.includes(pkg)) {
        logs.push(`[${ip}] ❎ ${pkg} not installed`);
        continue;
      }

      const out = await runAdb(`-s ${serial} shell pm uninstall ${pkg}`);
      logs.push(`[${ip}] ❌ Uninstalled ${pkg}: ${out.trim()}`);
    } catch (err) {
      logs.push(`[${ip}] ❌ Failed to uninstall ${pkg}: ${err.message}`);
    }
  }

  return logs;
}

async function uninstallAllSelected(ips) {
  const logs = [];
  for (const ip of ips) {
    const results = await uninstallAll(ip);
    logs.push(...results);
  }
  return logs;
}

async function installByFilename(serial, filename) {
  const apkPath = path.join(APK_DIR, filename);
  if (!fs.existsSync(apkPath)) throw new Error(`APK not found: ${apkPath}`);
  await runAdb(`-s ${serial} push "${apkPath}" /data/local/tmp/${filename}`);
  const out = await runAdb(`-s ${serial} shell pm install -r /data/local/tmp/${filename}`);
  await runAdb(`-s ${serial} shell rm /data/local/tmp/${filename}`);
  return `${filename}: ${out.trim()}`;
}

function getApkList() {
  return Object.values(APK_MAP);
}

module.exports = {
  APK_MAP,
  getApkList,
  installAll,
  uninstallAll,
  installAllSelected,
  uninstallAllSelected,
  installSingle,
  uninstallSingle,
  installByFilename,
};
