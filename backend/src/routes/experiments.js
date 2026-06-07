const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  saveExperiment, updateExperiment, getLibrary,
  getMyExperiments, getExperiment, publishTemplate,
  cloneTemplate, submitExperiment, gradeSubmission,
} = require('../controllers/experimentController');

const router = express.Router();

router.use(protect);

router.get('/library', getLibrary);
router.get('/mine', getMyExperiments);
router.get('/:id', getExperiment);

router.post('/', saveExperiment);
router.put('/:id', updateExperiment);
router.post('/:id/publish', authorize('instructor', 'admin'), publishTemplate);
router.post('/:id/clone', cloneTemplate);
router.post('/:id/submit', authorize('student'), submitExperiment);
router.patch('/:id/submissions/:subId/grade', authorize('instructor', 'admin'), gradeSubmission);

module.exports = router;
