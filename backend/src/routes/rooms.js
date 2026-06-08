const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  createRoom, getRoomByCode, getMyRooms,
  toggleLock, saveRoomState, appendAnalytics, deleteRoom,
} = require('../controllers/roomController');

const router = express.Router();

// All room routes require login
router.use(protect);

router.post('/', createRoom);
router.get('/mine', getMyRooms);
router.get('/:code', getRoomByCode);
router.patch('/:id/lock', authorize('instructor', 'admin'), toggleLock);
router.patch('/:id/state', saveRoomState);
router.post('/:id/analytics', appendAnalytics);
router.delete('/:id', deleteRoom);

module.exports = router;
