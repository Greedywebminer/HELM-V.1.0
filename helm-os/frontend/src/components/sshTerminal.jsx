import React, { useState } from "react";
import DeviceList from "./components/DeviceList";
import LogPanel from "./components/LogPanel";
import TerminalComponent from "./components/TerminalComponent";

export default function App() {
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [logs, setLogs] = useState([]);
  const [sshTerminalDevice, setSshTerminalDevice] = useState(null);

  const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`].slice(-200));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white p-4">
      <div className="mb-4 border border-cyan-500 rounded bg-black">
        {sshTerminalDevice ? (
          <TerminalComponent
            ip={sshTerminalDevice.ip}
            onClose={() => setSshTerminalDevice(null)}
          />
        ) : (
          <div className="text-sm text-gray-400 p-2 italic">SSH terminal will appear here after connection.</div>
        )}
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <DeviceList
          selectedDevices={selectedDevices}
          setSelectedDevices={setSelectedDevices}
          addLog={addLog}
          setSshTerminalDevice={setSshTerminalDevice}
        />
        <div className="w-[36rem] flex flex-col">
          <LogPanel logs={logs} />
        </div>
      </div>
    </div>
  );
}
