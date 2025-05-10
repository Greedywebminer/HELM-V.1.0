#!/data/data/com.termux/files/usr/bin/bash

echo "[*] Checking for saved PC IP in ~/adb_pc_ip.txt..."

if [ -f ~/adb_pc_ip.txt ]; then
  PC_IP=$(cat ~/adb_pc_ip.txt)
  echo "[*] Reconnecting ADB to $PC_IP:5555..."
  adb connect "$PC_IP:5555"
else
  echo "[!] No PC IP found. Skipping ADB reconnect."
fi
