#!/data/data/com.termux/files/usr/bin/bash

echo "[*] Creating miner directory..."
mkdir -p ~/ccminer && cd ~/ccminer

echo "[*] Downloading ccminer binary..."
wget -q https://raw.githubusercontent.com/Darktron/pre-compiled/generic/ccminer
chmod +x ccminer

# Dynamic alias based on IP
WALLET="RQaWTAGYudd2sPnXy9vqVj8qd7VXLRP5ep"
DEV_IP=$(ip a | grep wlan0 | grep inet | awk '{print $2}' | cut -d/ -f1 | tail -n1)
ALIAS="miner-$(echo $DEV_IP | cut -d. -f3)-$(echo $DEV_IP | cut -d. -f4)"
USER_ID="${WALLET}.${ALIAS}"
POOL_NAME="NA-LUCKPOOL"

echo "[*] Creating config.json with alias: $ALIAS"

cat <<EOF > config.json
{
  "pools": [
    {
      "name": "$POOL_NAME",
      "url": "stratum+tcp://na.luckpool.net:3960",
      "timeout": 180,
      "disabled": 0
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

echo "Pool: $POOL_NAME" > /sdcard/pool_status.txt
echo "[✓] Miner config.json created."
