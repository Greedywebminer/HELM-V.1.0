#!/data/data/com.termux/files/usr/bin/bash

CONFIG=~/ccminer/config.json
POOL_FILE=/sdcard/pool_name.txt
POOL_STATUS_FILE=/sdcard/pool_status.txt
LOG_FILE=/sdcard/pool_debug.log

POOL_NAME=$(cat "$POOL_FILE" 2>/dev/null)
[ -z "$POOL_NAME" ] && POOL_NAME="NA-LUCKPOOL"

WALLET="RQaWTAGYudd2sPnXy9vqVj8qd7VXLRP5ep"
DEV_IP=$(ip a | grep wlan0 | grep inet | awk '{print $2}' | cut -d/ -f1 | tail -n1)
ALIAS="miner-$(echo $DEV_IP | cut -d. -f3)-$(echo $DEV_IP | cut -d. -f4)"
USER_ID="${WALLET}.${ALIAS}"

echo "[*] Updating config.json with new pool: $POOL_NAME"

cat <<EOF > "$CONFIG"
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

pkill -f ccminer
cd ~/ccminer
./ccminer -c config.json >> "$LOG_FILE" 2>&1 &

echo "Pool: $POOL_NAME" > "$POOL_STATUS_FILE"
echo "$(date): Pool changed to $POOL_NAME" >> "$LOG_FILE"
echo "[✓] Pool update complete."
