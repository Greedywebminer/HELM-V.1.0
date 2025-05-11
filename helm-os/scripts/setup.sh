#!/data/data/com.termux/files/usr/bin/bash
# === Termux Miner + Auto-Connect Setup ===

echo "[*] Updating and upgrading packages..."
yes | pkg update && yes | pkg upgrade
if [ $? -ne 0 ]; then
  echo "[!] Failed to update/upgrade packages."
  exit 1
fi


echo "[*] Installing essential packages..."
yes | pkg install openssh libjansson wget nano android-tools jq -y

if [ $? -ne 0 ]; then
  echo "[!] Failed to install packages."
  exit 1
fi

echo "[*] Setting up SSH key-based authentication..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh

cat <<EOF >> ~/.ssh/authorized_keys
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQClP1+OrX8O8tkUQUvkJUyUy6VGUjE7tE7UDD7+R8esBOVYGDWwz0GWWOHvzRdLsgk1eiI3tNhgss6Mk1paqjvQHpFNvAIeHRcH9htZL5Sp9cc2o5N1tU+S5YrCgiySr7pGO4EFhLwzbbuybA68WoyEWM6g7+5MABbghvq4GLbxC69RKqe+qkMBsq1AY7PqqGXd+0R4H1MOhM+liOkTjhEpGQTABNN50XGR2e1sg1EOJrCRhyosEP5Pn0t+d93/zncWOTp24xx9bl2STbM+wMGVJTyIalOe6ReW6qLsHgw6TiKOKwYpWdKdbWeECEs0qTPLViVv/MhF2FEXfYmgh6A/ helm@Helm
EOF

chmod 600 ~/.ssh/authorized_keys

echo "[*] Starting SSH daemon..."
sshd || { echo "[!] Failed to start sshd."; exit 1; }

echo "[*] Setting up miner directory..."
mkdir -p ~/ccminer && cd ~/ccminer
wget -q https://raw.githubusercontent.com/Darktron/pre-compiled/generic/ccminer
# === Create config.json dynamically ===
echo "[*] Creating dynamic config.json with personalized worker ID..."

WALLET="RQaWTAGYudd2sPnXy9vqVj8qd7VXLRP5ep"
POOL_NAME="NA-LUCKPOOL"  # Change this to set default pool

# Extract device IP or fallback
DEV_IP=$(ip a | grep wlan0 | grep inet | awk '{print $2}' | cut -d/ -f1 | tail -n1)
ALIAS="miner-$(echo $DEV_IP | cut -d. -f3)-$(echo $DEV_IP | cut -d. -f4)"
USER_ID="$WALLET.$ALIAS"

cat <<EOF > ~/ccminer/config.json
{
    "pools": [
        {
            "name": "USW-VIPOR",
            "url": "stratum+tcp://usw.vipor.net:5040",
            "timeout": 180,
            "disabled": $( [ "$POOL_NAME" = "USW-VIPOR" ] && echo 0 || echo 1 )
        },
        {
            "name": "NA-LUCKPOOL",
            "url": "stratum+tcp://na.luckpool.net:3960",
            "timeout": 180,
            "disabled": $( [ "$POOL_NAME" = "NA-LUCKPOOL" ] && echo 0 || echo 1 )
        },
        {
            "name": "AIH-LOW",
            "url": "stratum+tcp://verus.aninterestinghole.xyz:9998",
            "timeout": 180,
            "disabled": $( [ "$POOL_NAME" = "AIH-LOW" ] && echo 0 || echo 1 )
        },
        {
            "name": "WW-ZERGPOOL",
            "url": "stratum+tcp://verushash.mine.zergpool.com:3300",
            "timeout": 180,
            "disabled": $( [ "$POOL_NAME" = "WW-ZERGPOOL" ] && echo 0 || echo 1 )
        }
    ],
    "user": "$USER_ID",
    "pass": "",
    "algo": "verus",
    "threads": 8,
    "cpu-priority": 1,
    "cpu-affinity": -1,
    "retry-pause": 5,
    "api-allow": "192.168.0.0/16",
    "api-bind": "0.0.0.0:4068"
}
EOF

echo "[✓] config.json created with worker: $USER_ID and default pool: $POOL_NAME"
echo "[*] Writing active pool to /sdcard/pool_status.txt for GUI tracking..."
ACTIVE_POOL=$(jq -r '.pools[] | select(.disabled==0) | .name' ~/ccminer/config.json)
echo "Pool: $ACTIVE_POOL" > /sdcard/pool_status.txt

wget -q https://raw.githubusercontent.com/Greedywebminer/test001/main/start.sh
chmod +x ccminer start.sh

echo "[*] Configuring Termux boot..."
mkdir -p ~/.termux/boot

echo "[*] Creating Termux Boot script for miner and ADB reconnect..."
cat << 'EOF' > ~/.termux/boot/boot.sh
#!/data/data/com.termux/files/usr/bin/bash

# Delay to ensure Wi-Fi + system is ready
sleep 10

# Wake lock + start SSH
termux-wake-lock
sshd

# Launch miner
cd ~/ccminer
./start.sh &

# Attempt ADB auto reconnect
ADB_PC_IP=$(cat ~/adb_pc_ip.txt 2>/dev/null)

if [ -n "$ADB_PC_IP" ]; then
  echo "$(date): ADB reconnect to $ADB_PC_IP:5555" >> /sdcard/adb_wifi_boot.log
  adb connect $ADB_PC_IP:5555 >> /sdcard/adb_wifi_boot.log 2>&1
else
  echo "$(date): No PC IP found at ~/adb_pc_ip.txt" >> /sdcard/adb_wifi_boot.log
fi

# Record successful boot execution
echo "Boot script executed on: $(date)" > /sdcard/termux_boot_status.txt
EOF

chmod +x ~/.termux/boot/boot.sh

echo "[*] Appending to .bashrc"
echo -e "\ntermux-wake-lock\nsshd\ncd ~/ccminer\n./start.sh" >> ~/.bashrc

echo "[*] Writing SSH info for GUI auto-connect..."
USER_NAME=$(whoami)
echo "$USER_NAME@<TO_BE_REPLACED_BY_ADB>" > /sdcard/ssh_info.txt

# === Termux Boot Script Diagnostics ===
echo "[*] Verifying Termux Boot installation..."

BOOT_SCRIPT=~/.termux/boot/boot.sh
BOOT_LOG=/sdcard/termux_boot_status.txt

if [ -x "$BOOT_SCRIPT" ]; then
  echo "[✓] boot.sh is present and executable."
else
  echo "[!] boot.sh is missing or not executable!"
fi

if [ -f "$BOOT_LOG" ]; then
  echo "[✓] boot.sh has run before. Last execution:"
  cat "$BOOT_LOG"
else
  echo "[!] No evidence that Termux Boot has run yet."
fi

echo "========================================"
echo "✅ SSH is ready. Miner is installed."
echo "📡 To enable ADB reconnect:"
echo "  → echo YOUR_PC_IP > ~/adb_pc_ip.txt"
echo "========================================"

echo "📝 To complete ADB reconnect automation:"
echo "  -> Push your PC's IP to the device: echo 192.168.x.x > ~/adb_pc_ip.txt"
echo "  -> This will be used on reboot to reconnect."

# --- Pool Updater Function Added ---
update_pool() {
    #!/data/data/com.termux/files/usr/bin/bash
    
    config_file="$HOME/ccminer/config.json"
    tmp_config="$HOME/ccminer/config_new.json"
    pool_status_file="/sdcard/pool_status.txt"
    log_file="/sdcard/pool_debug.log"
    restart_required=false
    
    # 🔧 Read pool name from pushed file or fallback
    POOL_NAME=$(cat /sdcard/pool_name.txt 2>/dev/null)
    [ -z "$POOL_NAME" ] && POOL_NAME="NA-LUCKPOOL"
    
    # Get device alias for worker ID
    DEV_IP=$(ip a | grep wlan0 | grep inet | awk '{print $2}' | cut -d/ -f1 | tail -n1)
    WALLET="RQaWTAGYudd2sPnXy9vqVj8qd7VXLRP5ep"
    ALIAS="miner-$(echo $DEV_IP | cut -d. -f3)-$(echo $DEV_IP | cut -d. -f4)"
    USER_ID="${WALLET}.${ALIAS}"
    
    # Desired config (static or pulled from server/API in future)
    fetched_config=$(cat <<EOF
    {
      "pools": [
        {
          "name": "USW-VIPOR",
          "url": "stratum+tcp://usw.vipor.net:5040",
          "timeout": 180,
          "disabled": 0
        },
        {
          "name": "NA-LUCKPOOL",
          "url": "stratum+tcp://na.luckpool.net:3960",
          "timeout": 180,
          "disabled": 1
        },
        {
          "name": "AIH-LOW",
          "url": "stratum+tcp://verus.aninterestinghole.xyz:9998",
          "timeout": 180,
          "disabled": 1
        },
        {
          "name": "WW-ZERGPOOL",
          "url": "stratum+tcp://verushash.mine.zergpool.com:3300",
          "timeout": 180,
          "disabled": 1
        }
      ],
      "user": "$USER_ID",
      "pass": "",
      "algo": "verus",
      "threads": 8,
      "cpu-priority": 1,
      "cpu-affinity": -1,
      "retry-pause": 5,
      "api-allow": "192.168.0.0/16",
      "api-bind": "0.0.0.0:4068"
    }
    EOF
    )
    
    # Write fetched config to tmp
    echo "$fetched_config" | jq -S . > "$tmp_config"
    
    # Compare with existing config
    if [ -f "$config_file" ]; then
      current=$(jq -S . "$config_file")
      new=$(jq -S . "$tmp_config")
    
      if [ "$current" != "$new" ]; then
        mv "$tmp_config" "$config_file"
        restart_required=true
        echo "$(date) [✓] Config updated" >> "$log_file"
      else
        rm "$tmp_config"
        echo "$(date) [=] No config changes" >> "$log_file"
      fi
    else
      mv "$tmp_config" "$config_file"
      restart_required=true
      echo "$(date) [+] Config initialized" >> "$log_file"
    fi
    
    # Restart miner if needed
    if [ "$restart_required" = true ]; then
      echo "$(date) [⛏] Restarting ccminer..." >> "$log_file"
      pkill -f ccminer
      cd ~/ccminer
./ccminer -c config.json >> "$log_file" 2>&1 | tee /sdcard/miner.log &
      sleep 2
      current_pool=$(jq -r '.pools[] | select(.disabled==0) | .name' "$config_file")
      echo "Pool: $current_pool" > "$pool_status_file"
      echo "$(date) [→] Active pool: $current_pool" >> "$log_file"
    fi
}
# --- End of Pool Updater ---
