#!/data/data/com.termux/files/usr/bin/bash

echo "[*] Updating and upgrading Termux packages..."
yes | pkg update && yes | pkg upgrade

echo "[*] Installing required packages..."
yes | pkg install openssh libjansson wget nano android-tools jq -y
