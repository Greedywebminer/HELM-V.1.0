// === frontend/src/components/LogPanel.jsx ===
import React from "react";

export default function LogPanel({ logs }) {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-bold text-cyan-300 mb-2">📋 Logs</h2>
      <div className="flex-1 bg-black bg-opacity-60 rounded p-2 text-sm overflow-y-auto font-mono border border-cyan-800">
        {logs.length === 0 && <p className="text-gray-500 italic">No logs yet.</p>}
        {logs.map((log, idx) => (
          <div key={idx} className="whitespace-pre-wrap text-gray-300">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}

