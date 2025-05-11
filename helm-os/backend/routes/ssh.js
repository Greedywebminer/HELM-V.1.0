const express = require("express");
const router = express.Router();
const { reconnectViaSsh } = require("../utils/ssh");

router.get("/:action/:ip", async (req, res) => {
  const { ip, action } = req.params;
  const serial = `${ip}:5555`;

  try {
    await reconnectViaSsh(serial, action);
    res.json({ success: true, message: `✅ ${action} succeeded on ${ip}` });
  } catch (err) {
    console.error(`❌ SSH ${action} failed for ${ip}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
