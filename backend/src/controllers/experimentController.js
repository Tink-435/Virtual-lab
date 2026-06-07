const Experiment = require('../models/Experiment');
const logger = require('../utils/logger');

/**
 * EXPERIMENT CONTROLLER
 *
 * Full EdTech workflow:
 *
 * SAVE    → Any user saves their current canvas as an experiment (with versioning)
 * PUBLISH → Instructor marks experiment as a template for students
 * CLONE   → Student forks a template to start their own copy
 * SUBMIT  → Student attaches their work to a template as a submission
 * GRADE   → Instructor reviews submission and assigns grade + feedback
 * LIBRARY → Public gallery of all published templates
 *
 * Versioning works like Git commits:
 * Each save appends to the versions[] array with a snapshot.
 * Students can "rewind" to any previous version.
 */

// ─── POST /api/experiments ────────────────────────────────────────────────
exports.saveExperiment = async (req, res) => {
  try {
    const { title, description, physicsState, analyticsData, thumbnail, note } = req.body;

    const experiment = await Experiment.create({
      title,
      description,
      physicsState,
      analyticsData,
      thumbnail,
      author: req.user.userId,
      authorName: req.body.authorName,
      versions: [{ version: 1, physicsState, note: note || 'Initial save' }],
      currentVersion: 1,
    });

    res.status(201).json({ experiment });
  } catch (err) {
    logger.error(`saveExperiment: ${err.message}`);
    res.status(500).json({ error: 'Failed to save experiment' });
  }
};

// ─── PUT /api/experiments/:id ─────────────────────────────────────────────
// Save a new version of an existing experiment
exports.updateExperiment = async (req, res) => {
  try {
    const { physicsState, analyticsData, thumbnail, note } = req.body;

    const experiment = await Experiment.findById(req.params.id);
    if (!experiment) return res.status(404).json({ error: 'Not found' });
    if (experiment.author.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not your experiment' });
    }

    const newVersion = experiment.currentVersion + 1;
    experiment.physicsState = physicsState;
    experiment.analyticsData = analyticsData;
    experiment.thumbnail = thumbnail;
    experiment.currentVersion = newVersion;
    experiment.versions.push({ version: newVersion, physicsState, note: note || `Version ${newVersion}` });

    await experiment.save();
    res.json({ experiment, version: newVersion });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update experiment' });
  }
};

// ─── GET /api/experiments/library ────────────────────────────────────────
// Public experiment library — all published templates
exports.getLibrary = async (req, res) => {
  try {
    const { tags, difficulty, search } = req.query;

    const query = { isPublished: true, isPublic: true, type: 'template' };
    if (tags) query.tags = { $in: tags.split(',') };
    if (difficulty) query.difficulty = difficulty;
    if (search) query.$text = { $search: search };

    const experiments = await Experiment.find(query)
      .select('title description tags difficulty authorName thumbnail likes views createdAt')
      .sort('-likes -views')
      .limit(50);

    res.json({ experiments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch library' });
  }
};

// ─── GET /api/experiments/mine ────────────────────────────────────────────
exports.getMyExperiments = async (req, res) => {
  try {
    const experiments = await Experiment.find({ author: req.user.userId })
      .select('title description type isPublished currentVersion createdAt updatedAt')
      .sort('-updatedAt');
    res.json({ experiments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch experiments' });
  }
};

// ─── GET /api/experiments/:id ─────────────────────────────────────────────
exports.getExperiment = async (req, res) => {
  try {
    const experiment = await Experiment.findById(req.params.id)
      .populate('author', 'name');
    if (!experiment) return res.status(404).json({ error: 'Not found' });

    // Increment view count
    experiment.views += 1;
    await experiment.save({ validateBeforeSave: false });

    res.json({ experiment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch experiment' });
  }
};

// ─── POST /api/experiments/:id/publish ───────────────────────────────────
exports.publishTemplate = async (req, res) => {
  try {
    const { instructions, rubric, isPublic } = req.body;
    const experiment = await Experiment.findById(req.params.id);
    if (!experiment) return res.status(404).json({ error: 'Not found' });
    if (experiment.author.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    experiment.type = 'template';
    experiment.isPublished = true;
    experiment.isPublic = !!isPublic;
    experiment.instructions = instructions;
    experiment.rubric = rubric;
    await experiment.save();

    res.json({ experiment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish' });
  }
};

// ─── POST /api/experiments/:id/clone ─────────────────────────────────────
// Student forks a template to start their own copy
exports.cloneTemplate = async (req, res) => {
  try {
    const source = await Experiment.findById(req.params.id);
    if (!source) return res.status(404).json({ error: 'Not found' });

    const clone = await Experiment.create({
      title: `${source.title} (My Copy)`,
      description: source.description,
      physicsState: source.physicsState,
      tags: source.tags,
      difficulty: source.difficulty,
      author: req.user.userId,
      authorName: req.body.authorName,
      type: 'personal',
      versions: [{ version: 1, physicsState: source.physicsState, note: `Cloned from "${source.title}"` }],
    });

    res.status(201).json({ experiment: clone });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clone' });
  }
};

// ─── POST /api/experiments/:id/submit ────────────────────────────────────
// Student submits their work against a template
exports.submitExperiment = async (req, res) => {
  try {
    const { physicsState, analyticsSnapshot, studentName } = req.body;

    const template = await Experiment.findById(req.params.id);
    if (!template || template.type !== 'template') {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check for existing submission
    const existing = template.submissions.find(
      s => s.studentId.toString() === req.user.userId
    );
    if (existing) {
      existing.physicsState = physicsState;
      existing.analyticsSnapshot = analyticsSnapshot;
      existing.submittedAt = new Date();
      existing.status = 'pending';
    } else {
      template.submissions.push({
        studentId: req.user.userId,
        studentName,
        physicsState,
        analyticsSnapshot,
      });
    }

    await template.save();
    res.json({ message: 'Submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit' });
  }
};

// ─── PATCH /api/experiments/:id/submissions/:subId/grade ─────────────────
// Instructor grades a submission
exports.gradeSubmission = async (req, res) => {
  try {
    const { grade, feedback } = req.body;

    const experiment = await Experiment.findById(req.params.id);
    if (!experiment) return res.status(404).json({ error: 'Not found' });
    if (experiment.author.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the template author can grade' });
    }

    const submission = experiment.submissions.id(req.params.subId);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    submission.grade = grade;
    submission.feedback = feedback;
    submission.status = 'graded';
    await experiment.save();

    res.json({ submission });
  } catch (err) {
    res.status(500).json({ error: 'Failed to grade' });
  }
};
