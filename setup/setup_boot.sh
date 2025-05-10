#!/data/data/com.termux/files/usr/bin/bash

echo "[*] Creating Termux Boot script..."

mkdir -p ~/.termux/boot

cat << 'EOF' > ~/.termux/boot/boot.sh
#!/data/data/com.termux/files/usr/bin/bash

sleep 10
termux-wake-lock
sshd

cd ~/ccminer
./ccminer -c config.json &

ADB_PC_IP=$(cat ~/adb_pc_ip.txt 2>/dev/null)
if [ -n "$ADB_PC_IP" ]; then
  echo "$(date): Reconnecting ADB to $ADB_PC_IP:5555" >> /sdcard/adb_wifi_boot.log
  adb connect $ADB_PC_IP:5555 >> /sdcard/adb_wifi_boot.log 2>&1
fi

echo "Boot script ran on: $(date)" > /sdcard/termux_boot_status.txt
EOF

chmod +x ~/.termux/boot/boot.sh

echo "[*] Appending miner autostart to .bashrc..."
echo -e "\ntermux-wake-lock\nsshd\ncd ~/ccminer\n./ccminer -c config.json &" >> ~/.bashrc

echo "[✓] Boot and .bashrc startup configured."
