import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { io } from "socket.io-client";
import "xterm/css/xterm.css";

export default function TerminalComponent({ ip, onClose }) {
  const terminalRef = useRef(null);
  const xterm = useRef(null);
  const fitAddon = useRef(null);
  const socket = useRef(null);

  useEffect(() => {
    // 1. Setup terminal
    xterm.current = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      theme: {
        background: "#1e1e1e",
        foreground: "#ffffff"
      }
    });

    fitAddon.current = new FitAddon();
    xterm.current.loadAddon(fitAddon.current);

    xterm.current.open(terminalRef.current);
    fitAddon.current.fit();

    // 2. Connect to backend PTY via WebSocket
    socket.current = io("/ssh", {
      query: { ip },
      transports: ["websocket"]
    });

    socket.current.on("connect", () => {
      xterm.current.writeln(`\x1b[32m[Connected to ${ip}]\x1b[0m`);
    });

    socket.current.on("data", (data) => {
      xterm.current.write(data);
    });

    socket.current.on("disconnect", () => {
      xterm.current.writeln(`\r\n\x1b[31m[Disconnected from ${ip}]\x1b[0m`);
    });

    socket.current.on("connect_error", (err) => {
      xterm.current.writeln(`\x1b[31mConnection error: ${err.message}\x1b[0m`);
    });

    // 3. Send terminal input to backend
    xterm.current.onData((data) => {
      socket.current.emit("input", data);
    });

    // Cleanup on unmount
    return () => {
      socket.current.disconnect();
      xterm.current.dispose();
    };
  }, [ip]);

  return (
    <div className="relative bg-black border border-cyan-500 rounded-md overflow-hidden">
      <div ref={terminalRef} className="h-[400px] w-full" />
      <button
        onClick={onClose}
        className="absolute top-0 right-0 m-2 px-2 py-1 bg-red-600 hover:bg-red-700 text-sm text-white rounded"
      >
        ✕
      </button>
    </div>
  );
}
