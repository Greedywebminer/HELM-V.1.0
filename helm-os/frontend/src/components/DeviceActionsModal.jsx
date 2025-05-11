import React, { useState } from "react";
import TerminalComponent from "./TerminalComponent";

const API = import.meta.env.VITE_API_BASE || "http://localhost:3000";

export default function DeviceActionsModal({ device, close, addLog, open }) {
  const [showTerminal, setShowTerminal] = useState(false);

  if (!device || !open) return null;

  const runSshAction = async (ip, action) => {
    try {
      const res = await fetch(`/api/ssh/${action}/${ip}`);
      const data = await res.json();
      if (data.success) {
        addLog(`✅ ${action} on ${ip}`);
      } else {
        addLog(`❌ ${action} failed on ${ip}: ${data.error}`);
      }
    } catch (err) {
      addLog(`❌ SSH request error: ${err.message}`);
    }
  };

  async function callRoute(path, data, label) {
    try {
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json.logs && Array.isArray(json.logs)) {
          json.logs.forEach(log => addLog(`[${device.alias || device.ip}] ${log}`));
        } else {
          addLog(`[${device.alias || device.ip}] ✅ ${label || json?.message || "Done"}`);
        }
      } catch (err) {
        addLog(`[${device.alias || device.ip}] ❌ Invalid JSON: ${text}`);
      }
    } catch (err) {
      addLog(`[${device.alias || device.ip}] ❌ ${err.message}`);
    }
  }

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl space-y-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          ⚙️ Device Actions: <span className="text-blue-600">{device.alias || device.ip}</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              const alias = prompt("Enter new alias:");
              if (alias) callRoute("/api/devices/rename", { ip: device.ip, alias }, `Renamed to ${alias}`);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-medium shadow"
          >
            ✏️ Rename Alias
          </button>

          <button
            onClick={() => callRoute("/api/reboot", { ip: device.ip }, "Rebooted")}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl font-medium shadow"
          >
            🔁 Reboot Device
          </button>

          <button onClick={() => runSshAction(device.ip, "run-setup")} className="bg-green-700 text-white px-3 py-2 rounded-xl shadow">
            🛠 Setup
          </button>

          <button onClick={() => runSshAction(device.ip, "restart-miner")} className="bg-yellow-700 text-white px-3 py-2 rounded-xl shadow">
            🔁 Restart
          </button>

          <button onClick={() => runSshAction(device.ip, "reboot")} className="bg-pink-600 text-white px-3 py-2 rounded-xl shadow">
            ⚡ Reboot
          </button>

         <button
            onClick={() => callRoute(`/api/ssh/reconnect/${device.ip}`, {}, "SSH Reconnect")}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-xl font-medium shadow"
          >
            🔐 SSH Connect
          </button>

          <button
            onClick={() => callRoute("/api/scrcpy", { ip: device.ip }, "Launched scrcpy")}
            className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 rounded-xl font-medium shadow"
          >
            🎥 Start scrcpy
          </button>

          <button
            onClick={() => callRoute(`/api/termux/restart/${device.ip}`, {}, "Restarted Termux")}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl font-medium shadow"
          >
            🔄 Restart Termux
          </button>

          <button
            onClick={() => callRoute(`/api/run-script/${device.ip}`, {}, "Setup Completed")}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-xl font-medium shadow"
          >
            ⚙️ Setup Miner
          </button>

          <button
            onClick={() => callRoute("/api/debloat", { ip: device.ip }, "Debloated")}
            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl font-medium shadow"
          >
            🧹 Auto Debloat
          </button>

          <button
            onClick={() => callRoute("/api/adb-cleanup", { ip: device.ip }, "Cleaned ADB")}
            className="bg-lime-600 hover:bg-lime-700 text-white px-3 py-2 rounded-xl font-medium shadow"
          >
            🧼 ADB Cleanup
          </button>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => close?.()}
            className="text-sm text-gray-500 hover:text-black underline"
          >
            ❌ Close
          </button>
        </div>

        {/* Embedded Terminal UI */}
        {showTerminal && (
          <TerminalComponent visible={true} onClose={() => setShowTerminal(false)} />
        )}
      </div>
    </div>
  );
}
