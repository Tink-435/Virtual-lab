const express = require('express');
const { protect } = require('../middleware/auth');
const Room = require('../models/Room');

const router = express.Router();
router.use(protect);

// GET /api/analytics/:roomId — fetch full analytics log for a room
router.get('/:roomId', async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).select('analyticsLog name');
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ analyticsLog: room.analyticsLog, roomName: room.name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
