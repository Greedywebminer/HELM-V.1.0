import { useState } from "react";
import { runDeviceAction } from "../utils/actions";
import { Button } from "@/components/ui/button";
import { Monitor, Download, RefreshCw, Power, Trash2, Zap, Plug, Plug2, TerminalSquare, Video, Settings2 } from "lucide-react";

const ACTIONS = [
  {
    label: "Setup",
    icon: <Download size={18} />,
    action: (serial) => runDeviceAction(serial, "setup", "Setup"),
    color: "bg-blue-600 hover:bg-blue-700",
  },
  {
    label: "Install APKs",
    icon: <Download size={18} />,
    action: (serial) => runDeviceAction(serial, "apks/install", "Install APKs"),
    color: "bg-green-600 hover:bg-green-700",
  },
  {
    label: "Reboot",
    icon: <Power size={18} />,
    action: (serial) => runDeviceAction(serial, "reboot", "Reboot"),
    color: "bg-red-600 hover:bg-red-700",
  },
  {
    label: "Debloat",
    icon: <Trash2 size={18} />,
    action: (serial) => runDeviceAction(serial, "debloat", "Debloat"),
    color: "bg-orange-600 hover:bg-orange-700",
  },
  {
    label: "Restart Miner",
    icon: <RefreshCw size={18} />,
    action: (serial) => runDeviceAction(serial, "miner/restart", "Restart Miner"),
    color: "bg-yellow-500 hover:bg-yellow-600 text-black",
  },
  {
    label: "Setup Miner",
    icon: <Settings2 size={18} />,
    action: (serial) => runDeviceAction(serial, "miner/setup", "Setup Miner"),
    color: "bg-cyan-600 hover:bg-cyan-700",
  },
  {
    label: "Show Logs",
    icon: <Monitor size={18} />,
    action: (serial) => runDeviceAction(serial, "logs", "Show Logs"),
    color: "bg-gray-800 hover:bg-gray-700",
  },
  {
    label: "Restart ADB",
    icon: <Zap size={18} />,
    action: (serial) => runDeviceAction(serial, "adb/restart", "Restart ADB"),
    color: "bg-purple-600 hover:bg-purple-700",
  },
  {
    label: "Restart Termux",
    icon: <TerminalSquare size={18} />,
    action: (serial) => runDeviceAction(serial, "termux/restart", "Restart Termux"),
    color: "bg-indigo-600 hover:bg-indigo-700",
  },
  {
    label: "Connect ADB",
    icon: <Plug size={18} />,
    action: (serial) => runDeviceAction(serial, "adb/connect", "Connect ADB"),
    color: "bg-teal-600 hover:bg-teal-700",
  },
  {
    label: "Disconnect ADB",
    icon: <Plug2 size={18} />,
    action: (serial) => runDeviceAction(serial, "adb/disconnect", "Disconnect ADB"),
    color: "bg-pink-600 hover:bg-pink-700",
  },
  {
    label: "Launch Scrcpy",
    icon: <Video size={18} />,
    action: (serial) => runDeviceAction(serial, "scrcpy", "Launch Scrcpy"),
    color: "bg-lime-600 hover:bg-lime-700",
  },
];

export default function DeviceActions({ serial, onClose }) {
  const [loading, setLoading] = useState(null);

  const handleClick = async (actionFn, label) => {
    setLoading(label);
    try {
      await actionFn(serial);
    } catch (err) {
      console.error(`[${label}] Error:`, err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 bg-black/80 rounded-xl shadow-2xl grid grid-cols-2 sm:grid-cols-3 gap-4">
      {ACTIONS.map(({ label, icon, action, color }) => (
        <Button
          key={label}
          disabled={loading !== null}
          onClick={() => handleClick(action, label)}
          className={`w-full py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 rounded-xl ${color} transition-all duration-200`}
        >
          {icon} {label}
        </Button>
      ))}
      {onClose && (
        <Button
          onClick={onClose}
          className="col-span-full bg-white/10 hover:bg-white/20 text-white mt-4"
        >
          Close
        </Button>
      )}
    </div>
  );
}
