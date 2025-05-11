import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import DeviceTable from "./components/DeviceTable";
import Controls from "./components/Controls";
import DeviceActions from "./components/DeviceActions";
import LogPanel from "./components/LogPanel";

const API = import.meta.env.VITE_API_BASE || "http://localhost:3000";

export default function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDevice, setModalDevice] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pendingPool, setPendingPool] = useState("");
  const [pendingApk, setPendingApk] = useState("");

  const addLog = (msg) => {
    setLogs((prev) => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    const socket = io(API);
    socket.on("deviceList", setDevices);
    socket.on("deviceUpdate", setDevices);
    fetchDevices();
    return () => socket.disconnect();
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API}/api/devices/enriched`);
      const data = await res.json();
      setDevices(Object.values(data));
      addLog("Device list refreshed.");
    } catch (err) {
      addLog("⚠️ Failed to fetch devices.");
    }
  };

  const toggleDevice = (ip) => {
    const updated = new Set(selectedDevices);
    if (updated.has(ip)) updated.delete(ip);
    else updated.add(ip);
    setSelectedDevices(updated);
  };

  const applyChanges = async () => {
    const ips = Array.from(selectedDevices);
    if (!ips.length) return;

    if (pendingPool) {
      await fetch(`${API}/api/pool/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ips, pool: pendingPool }),
      });
      addLog(`⛏️ Pool switched to ${pendingPool} for selected devices.`);
    }

    if (pendingApk) {
      await fetch(`${API}/api/apk-install-selected`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ips, apk: pendingApk }),
      });
      addLog(`📱 ${pendingApk} pushed to selected devices.`);
    }

    setPendingPool("");
    setPendingApk("");
    fetchDevices();
  };

  const filtered = devices.filter((d) =>
    [d.alias, d.ip, d.pool].some((f) =>
      (f || "").toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div
      className="min-h-screen bg-cover bg-center text-white p-6"
      style={{ backgroundImage: "url('/background.jpg')" }}
    >
      <div className="flex gap-4 max-w-[95vw] mx-auto">
        {/* Main Panel */}
        <div className="flex-1 rounded-xl border border-cyan-700 bg-gray-900 bg-opacity-90 p-6 shadow-2xl">
          <h1 className="text-4xl font-extrabold text-center text-cyan-300 mb-6 drop-shadow-lg">
            HELM OS Miner Dashboard
          </h1>

          <Controls
            selectedDevices={selectedDevices}
            setSelectedDevices={setSelectedDevices}
            fetchDevices={fetchDevices}
            search={search}
            setSearch={setSearch}
            addLog={addLog}
            pendingPool={pendingPool}
            setPendingPool={setPendingPool}
            pendingApk={pendingApk}
            setPendingApk={setPendingApk}
          />

          {selectedDevices.size > 0 && (pendingPool || pendingApk) && (
            <div className="text-right mt-2">
              <button
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded"
                onClick={applyChanges}
              >
                ✅ Apply Changes
              </button>
            </div>
          )}

          <DeviceTable
            devices={filtered}
            selectedDevices={selectedDevices}
            toggleDevice={toggleDevice}
          />

          {modalOpen && modalDevice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
              <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full">
                <h2 className="text-xl font-bold text-cyan-300 mb-4 text-center">
                  Actions for {modalDevice.alias || modalDevice.ip}
                </h2>
                <DeviceActions
                  serial={modalDevice.serial || modalDevice.ip + ":5555"}
                  onClose={() => setModalOpen(false)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Log Panel */}
        <div className="w-[25vw] rounded-xl border border-cyan-700 bg-gray-900 bg-opacity-90 p-4 shadow-xl">
          <LogPanel logs={logs} />
        </div>
      </div>
    </div>
  );
}
