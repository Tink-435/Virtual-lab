const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * USER MODEL
 *
 * RBAC (Role-Based Access Control) — the core of our auth system.
 * Three roles:
 *   - student: can join rooms, run experiments, view analytics
 *   - instructor: can also create rooms, publish templates, grade submissions
 *   - admin: full access including user management
 *
 * Why store passwordHash instead of password?
 * We NEVER store plaintext passwords. bcrypt hashes are one-way —
 * even if your DB is leaked, attackers can't reverse them.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never returned in queries by default
    },
    role: {
      type: String,
      enum: ['student', 'instructor', 'admin'],
      default: 'student',
    },
    // Tracks which rooms this user has participated in
    roomHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room' }],

    // Experiment submissions (students)
    submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }],

    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ─── Pre-save hook: hash password before storing ───────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  // Cost factor 12 = ~250ms hash time — strong enough to slow brute force
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// ─── Instance method: verify password ─────────────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

// ─── Instance method: safe public profile (no hash) ───────────────────────
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
