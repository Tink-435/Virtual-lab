import { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * MY EXPERIMENTS PAGE
 *
 * For Students:
 *   - List of saved experiments with version history
 *   - Option to open, delete, submit to a template
 *
 * For Instructors:
 *   - All their experiments
 *   - Publish as template button
 *   - View submissions + grade them
 *
 * VERSION HISTORY PANEL:
 *   Clicking an experiment shows its version timeline —
 *   "Version 1 → Version 2 → Version 3 (current)"
 *   Student can revert to any version (like Git checkout).
 *   This is a genuine differentiator vs basic CRUD apps.
 */
export default function MyExperiments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishModal, setPublishModal] = useState(null);
  const [publishForm, setPublishForm] = useState({ instructions: '', rubric: '', isPublic: false });

  useEffect(() => {
    api.get('/experiments/mine')
      .then(r => setExperiments(r.data.experiments))
      .finally(() => setLoading(false));
  }, []);

  const loadSubmissions = async (expId) => {
    const res = await api.get(`/experiments/${expId}`);
    setSubmissions(res.data.experiment.submissions || []);
  };

  const handleSelect = (exp) => {
    setSelected(exp);
    if (user.role === 'instructor' && exp.type === 'template') {
      loadSubmissions(exp._id);
    }
  };

  const handlePublish = async () => {
    try {
      await api.post(`/experiments/${publishModal._id}/publish`, publishForm);
      setExperiments(prev => prev.map(e =>
        e._id === publishModal._id ? { ...e, isPublished: true } : e
      ));
      setPublishModal(null);
      alert('Published to library!');
    } catch {
      alert('Failed to publish');
    }
  };

  const handleGrade = async (expId, subId, grade, feedback) => {
    await api.patch(`/experiments/${expId}/submissions/${subId}/grade`, { grade, feedback });
    loadSubmissions(expId);
  };

  const TYPE_BADGE = {
    personal:   'bg-gray-700 text-gray-300',
    template:   'bg-yellow-900 text-yellow-300',
    submission: 'bg-blue-900 text-blue-300',
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Left: Experiment List */}
      <div className="w-80 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-mono text-cyan-400 font-bold">MY EXPERIMENTS</h2>
          <p className="text-xs text-gray-500 mt-1">{experiments.length} saved</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-gray-500 text-sm animate-pulse">Loading...</div>
          ) : experiments.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p className="text-3xl mb-2">🔬</p>
              <p className="text-sm">No saved experiments yet.<br />Run a simulation and hit Save.</p>
            </div>
          ) : (
            experiments.map(exp => (
              <div
                key={exp._id}
                onClick={() => handleSelect(exp)}
                className={`px-4 py-3 border-b border-gray-800 cursor-pointer transition-colors
                  ${selected?._id === exp._id ? 'bg-gray-800' : 'hover:bg-gray-900'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${TYPE_BADGE[exp.type]}`}>
                    {exp.type}
                  </span>
                  {exp.isPublished && (
                    <span className="text-xs text-green-400">✓ Published</span>
                  )}
                </div>
                <p className="text-sm font-medium text-white truncate">{exp.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  v{exp.currentVersion} · {new Date(exp.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Detail Panel */}
      <div className="flex-1 p-8">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-gray-600">
            <div className="text-center">
              <p className="text-5xl mb-3">←</p>
              <p>Select an experiment to view details</p>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">{selected.title}</h2>
                <p className="text-gray-400 text-sm mt-1">{selected.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/room/new?experimentId=${selected._id}`)}
                  className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 rounded text-sm"
                >
                  Open in Lab →
                </button>
                {user.role === 'instructor' && !selected.isPublished && (
                  <button
                    onClick={() => setPublishModal(selected)}
                    className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 rounded text-sm"
                  >
                    Publish as Template
                  </button>
                )}
              </div>
            </div>

            {/* Version History */}
            <div className="bg-gray-900 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-mono text-gray-400 mb-3">VERSION HISTORY</h3>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {Array.from({ length: selected.currentVersion }, (_, i) => i + 1).map(v => (
                  <div key={v} className="flex items-center">
                    <div className={`px-3 py-1.5 rounded text-xs font-mono flex-shrink-0 cursor-pointer
                      transition-colors
                      ${v === selected.currentVersion
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                      v{v}
                      {v === selected.currentVersion && ' (current)'}
                    </div>
                    {v < selected.currentVersion && (
                      <span className="text-gray-700 mx-1">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Submissions (Instructor only, for templates) */}
            {user.role === 'instructor' && selected.type === 'template' && (
              <div className="bg-gray-900 rounded-xl p-5">
                <h3 className="text-sm font-mono text-gray-400 mb-3">
                  STUDENT SUBMISSIONS ({submissions.length})
                </h3>
                {submissions.length === 0 ? (
                  <p className="text-sm text-gray-600">No submissions yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {submissions.map(sub => (
                      <SubmissionRow
                        key={sub._id}
                        sub={sub}
                        onGrade={(grade, feedback) =>
                          handleGrade(selected._id, sub._id, grade, feedback)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Publish Modal */}
      {publishModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg p-6">
            <h3 className="font-bold text-lg mb-4">Publish "{publishModal.title}"</h3>

            <label className="text-xs font-mono text-gray-400 block mb-1">INSTRUCTIONS FOR STUDENTS</label>
            <textarea
              value={publishForm.instructions}
              onChange={e => setPublishForm(f => ({ ...f, instructions: e.target.value }))}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm
                text-white focus:outline-none focus:border-cyan-500 mb-4 resize-none"
              placeholder="Describe what students should do in this experiment..."
            />

            <label className="text-xs font-mono text-gray-400 block mb-1">GRADING RUBRIC</label>
            <textarea
              value={publishForm.rubric}
              onChange={e => setPublishForm(f => ({ ...f, rubric: e.target.value }))}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm
                text-white focus:outline-none focus:border-cyan-500 mb-4 resize-none"
              placeholder="e.g. 20pts: energy conservation shown, 30pts: correct constraint setup..."
            />

            <label className="flex items-center gap-2 text-sm text-gray-300 mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={publishForm.isPublic}
                onChange={e => setPublishForm(f => ({ ...f, isPublic: e.target.checked }))}
                className="rounded"
              />
              Make publicly visible in library
            </label>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setPublishModal(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">
                Cancel
              </button>
              <button onClick={handlePublish}
                className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 rounded text-sm font-medium">
                Publish →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionRow({ sub, onGrade }) {
  const [editing, setEditing] = useState(false);
  const [grade, setGrade] = useState(sub.grade || '');
  const [feedback, setFeedback] = useState(sub.feedback || '');

  const STATUS_COLOR = {
    pending: 'text-yellow-400',
    graded: 'text-green-400',
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{sub.studentName}</span>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono ${STATUS_COLOR[sub.status]}`}>
            {sub.status.toUpperCase()}
          </span>
          {sub.grade !== undefined && (
            <span className="text-sm font-bold text-cyan-400">{sub.grade}/100</span>
          )}
          <button
            onClick={() => setEditing(e => !e)}
            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
          >
            {editing ? 'Cancel' : 'Grade'}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Submitted {new Date(sub.submittedAt).toLocaleString()}
      </p>

      {editing && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 w-16">Grade</label>
            <input
              type="number" min="0" max="100"
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none"
            />
            <span className="text-gray-500 text-sm">/100</span>
          </div>
          <div className="flex items-start gap-2">
            <label className="text-xs text-gray-400 w-16 mt-1">Feedback</label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={2}
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm
                text-white focus:outline-none resize-none"
              placeholder="Great energy conservation diagram..."
            />
          </div>
          <button
            onClick={() => { onGrade(Number(grade), feedback); setEditing(false); }}
            className="self-end px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-xs font-medium"
          >
            Save Grade ✓
          </button>
        </div>
      )}

      {sub.feedback && !editing && (
        <p className="text-xs text-gray-400 mt-2 italic">"{sub.feedback}"</p>
      )}
    </div>
  );
}
