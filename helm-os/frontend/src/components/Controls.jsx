import React, { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:3000";

const POOLS = ["NA-LUCKPOOL", "USW-VIPOR", "AIH-LOW", "WW-ZERGPOOL"];

export default function Controls({
  selectedDevices,
  setSelectedDevices,
  fetchDevices,
  search,
  setSearch,
  addLog,
}) {
  const [apkList, setApkList] = useState([]);
  const [selectedApk, setSelectedApk] = useState("");
  const [selectedPool, setSelectedPool] = useState("");
  const [applyToAll, setApplyToAll] = useState(false);
  const [allDevices, setAllDevices] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apkRes = await fetch(`${API}/api/apk-list`);
        const apkData = await apkRes.json();
        setApkList(apkData);

        const devRes = await fetch(`${API}/api/devices/enriched`);
        const devData = await devRes.json();
        const devices = Object.values(devData);
        setAllDevices(devices);

        const connectedIps = new Set(devices.map(d => d.ip));
        setSelectedDevices(prev => new Set([...prev].filter(ip => connectedIps.has(ip))));
      } catch {
        addLog("⚠️ Failed to load device or APK data");
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const post = async (url, body) => {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      addLog(`❌ Invalid JSON from ${url}: ${text}`);
      return;
    }

    if (data.logs) data.logs.forEach(addLog);
    else addLog(data.status || data.error || "✅ Success");

    fetchDevices();
  } catch (err) {
    addLog(`❌ Error: ${err.message}`);
  }
};

  const targetIps = applyToAll ? allDevices.map((d) => d.ip) : Array.from(selectedDevices);

  const applyPoolChange = () => {
    if (!selectedPool || targetIps.length === 0) return;
    post(`${API}/api/pool/switch`, {
      ips: targetIps,
      pool: selectedPool,
    });
  };

  const applyApkInstall = () => {
    if (!selectedApk || targetIps.length === 0) return;
    post(`${API}/api/apk-install-selected`, {
      ips: targetIps,
      apk: selectedApk,
    });
  };

  const installAllApks = () => {
    if (targetIps.length === 0) return;
    post(`${API}/api/apk-install-all-selected`, {
      ips: targetIps,
    });
  };

  const uninstallAllApks = () => {
    if (targetIps.length === 0) return;
    post(`${API}/api/apk-uninstall-all-selected`, {
      ips: targetIps,
    });
  };

  const selectAllDevices = () => {
    const allIps = allDevices.map((d) => d.ip);
    setSelectedDevices(new Set(allIps));
  };

  const runSetupScript = () => {
    if (targetIps.length === 0) return;
    post(`${API}/api/setup-multi`, { ips: targetIps });
  };

  return (
    <div className="flex flex-wrap justify-center gap-2 mb-6">
      <button
        className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded shadow text-sm"
        onClick={fetchDevices}
      >
        🔄 Refresh
      </button>

      <button
        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded shadow text-sm"
        onClick={() => post(`${API}/api/restart-termux-all`, {})}
      >
        ⚙️ Restart Termux (All)
      </button>

      <input
        type="text"
        className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-600 shadow-inner text-sm w-48"
        placeholder="🔍 Search miners..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <select
        value={selectedApk}
        onChange={(e) => setSelectedApk(e.target.value)}
        className="text-black text-sm px-2 py-1 rounded shadow"
      >
        <option value="">📱 Select APK</option>
        {apkList.map((apk) => (
          <option key={apk.pkg} value={apk.pkg}>{apk.name}</option>
        ))}
      </select>

      <button
        className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded shadow text-sm"
        onClick={applyApkInstall}
      >
        📥 Apply APK to {applyToAll ? "All" : "Selected"} Devices
      </button>

      <button
        className="bg-green-900 hover:bg-green-950 text-white px-3 py-1 rounded shadow text-sm"
        onClick={installAllApks}
      >
        📦 Install All APKs ({applyToAll ? "All" : "Selected"})
      </button>

      <button
        className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded shadow text-sm"
        onClick={uninstallAllApks}
      >
        🗑️ Uninstall All APKs ({applyToAll ? "All" : "Selected"})
      </button>

      <select
        value={selectedPool}
        onChange={(e) => setSelectedPool(e.target.value)}
        className="text-black text-sm px-2 py-1 rounded shadow"
      >
        <option value="">⛏️ Select Pool</option>
        {POOLS.map((pool) => (
          <option key={pool} value={pool}>{pool}</option>
        ))}
      </select>

      <button
        className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded shadow text-sm"
        onClick={runSetupScript}
      >
        🛠 Run setup.sh ({applyToAll ? "All" : "Selected"})
      </button>

      <button
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow text-sm"
        onClick={applyPoolChange}
      >
        🔁 Apply Pool to {applyToAll ? "All" : "Selected"} Devices
      </button>

      <label className="text-sm flex items-center gap-1 bg-gray-700 px-2 py-1 rounded text-white">
        <input
          type="checkbox"
          checked={applyToAll}
          onChange={() => setApplyToAll(!applyToAll)}
        />
        Apply to {applyToAll ? "All Devices" : "Selected Devices"}
      </label>

      <button
        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded shadow text-sm"
        onClick={selectAllDevices}
      >
        ✅ Select All Devices
      </button>

      <button
        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded shadow text-sm"
        onClick={() => setSelectedDevices(new Set())}
      >
        🧹 Clear Selection
      </button>
    </div>
  );
}
