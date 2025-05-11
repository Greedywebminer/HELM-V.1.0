const express = require("express");
const router = express.Router();
const { runAdb } = require("../utils/adb");

const isValidIp = (ip) => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip);

router.get("/all", async (req, res) => {
  const devices = require("../data/devices.json");
  const results = {};

  for (const ip of Object.keys(devices)) {
    if (!isValidIp(ip)) {
      console.warn(`[device-info] Skipping invalid IP: ${ip}`);
      continue;
    }

    const serial = `${ip}:5555`;
    let ipOut = "", tempOut = "", netOut = "";

    try {
      ipOut = await runAdb(`-s ${serial} shell ip -f inet addr show wlan0`);
      const matchIp = ipOut.match(/inet (\d+\.\d+\.\d+\.\d+)/);
      const ipAddr = matchIp?.[1] || "Unavailable";

      tempOut = await runAdb(`-s ${serial} shell dumpsys battery | grep temperature`);
      const m = tempOut.match(/temperature:\s*(\d+)/);
      const fahrenheit = m ? ((parseInt(m[1]) / 10) * 9 / 5 + 32).toFixed(1) + "°F" : "Unavailable";

      netOut = await runAdb(`-s ${serial} shell "ping -c 1 -W 1 8.8.8.8 > /dev/null && echo CONNECTED || echo NOT CONNECTED"`);

      results[ip] = {
        ip: ipAddr,
        temperature: fahrenheit,
        internet: netOut.trim()
      };
    } catch (err) {
      console.warn(`[device-info] Error for ${ip}: ${err.message}`);
      results[ip] = {
        ip: "Unavailable",
        temperature: "Unavailable",
        internet: "❌"
      };
    }
  }

  res.json(results);
});

module.exports = router;
