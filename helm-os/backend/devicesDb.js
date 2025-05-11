// backend/devicesDb.js
const path = require('path');
const fs = require('fs');

const DB_FILE = path.join(__dirname, 'devices.json');
// Make sure devices.json exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ devices: {} }, null, 2));
}

let _db; 

async function _initLowdb() {
  if (_db) return _db;
  // dynamic ESM import
  const { Low } = await import('lowdb');
  const { JSONFile } = await import('lowdb/node');
  const adapter = new JSONFile(DB_FILE);
  // Pass your default data here:
  const db = new Low(adapter, { devices: {} });
  await db.read();
  // After read, db.data will be file contents, or your default if empty
  _db = db;
  return db;
}

async function initDb() {
  await _initLowdb();
}

async function upsertDevice(serial, ip) {
  const db = await _initLowdb();
  db.data.devices[serial] = { serial, ip, lastSeen: Date.now() };
  await db.write();
}

async function listDevices() {
  const db = await _initLowdb();
  return Object.values(db.data.devices);
}

async function deleteDevice(serial) {
  const db = await _initLowdb();
  if (db.data.devices[serial]) {
    delete db.data.devices[serial];
    await db.write();
    return true;
  }
  return false;
}

module.exports = {
  initDb,
  upsertDevice,
  listDevices,
  deleteDevice
};
