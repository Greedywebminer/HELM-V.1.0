// === frontend/src/components/DeviceStatsWidget.jsx ===
import React from "react";

export default function DeviceStatsWidget({ device }) {
  if (!device) return null;

  const { alias, ip, lastSeen, health, hashrate, pool } = device;

  return (
    <div className="bg-gray-800 rounded p-3 mb-4 text-sm border border-cyan-700">
      <h2 className="text-cyan-300 text-lg font-semibold mb-2">
        📟 {alias || "Unnamed"} ({ip})
      </h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span>🕒 Last Seen:</span>
        <span>{lastSeen ? new Date(lastSeen).toLocaleString() : "N/A"}</span>

        <span>🌡 Temp:</span>
        <span>{health?.temp || "N/A"}</span>

        <span>⚙ Hashrate:</span>
        <span>{hashrate || "N/A"}</span>

        <span>🎯 Pool:</span>
        <span>{pool || "N/A"}</span>
      </div>
    </div>
  );
}
