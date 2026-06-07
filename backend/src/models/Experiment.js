const mongoose = require('mongoose');

/**
 * EXPERIMENT MODEL
 *
 * An Experiment is a saved/published physics scenario.
 * Two subtypes:
 *   - 'template': published by instructor for students to clone (Experiment Library)
 *   - 'submission': student's completed work, attached to a template assignment
 *
 * This creates the full EdTech workflow:
 *   Instructor publishes template → Students clone → Students submit → Instructor grades
 */

const submissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentName: String,
  submittedAt: { type: Date, default: Date.now },
  physicsState: mongoose.Schema.Types.Mixed,
  analyticsSnapshot: mongoose.Schema.Types.Mixed,
  grade: { type: Number, min: 0, max: 100 },
  feedback: String,
  status: {
    type: String,
    enum: ['pending', 'graded'],
    default: 'pending',
  },
}, { _id: true });

const experimentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    tags: [String], // e.g. ['mechanics', 'pendulum', 'energy']
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },

    type: {
      type: String,
      enum: ['template', 'submission', 'personal'],
      default: 'personal',
    },

    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: String,

    // The actual saved physics world
    physicsState: { type: mongoose.Schema.Types.Mixed, required: true },

    // For templates: instructions shown to students
    instructions: String,

    // For templates: expected outcomes / grading rubric
    rubric: String,

    // Version history — every save creates a new version entry
    // This lets students see how their experiment evolved
    versions: [{
      version: Number,
      savedAt: { type: Date, default: Date.now },
      physicsState: mongoose.Schema.Types.Mixed,
      note: String,
      _id: false,
    }],
    currentVersion: { type: Number, default: 1 },

    // For templates: student submissions
    submissions: [submissionSchema],

    // Visibility
    isPublished: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },

    // Analytics from the final run
    analyticsData: mongoose.Schema.Types.Mixed,

    thumbnail: String, // base64 canvas screenshot
    likes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

experimentSchema.index({ author: 1 });
experimentSchema.index({ tags: 1 });
experimentSchema.index({ isPublished: 1, isPublic: 1 });

module.exports = mongoose.model('Experiment', experimentSchema);
