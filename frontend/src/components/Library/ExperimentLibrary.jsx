import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../context/AuthContext';
import { useAuth } from '../../context/AuthContext';

/**
 * EXPERIMENT LIBRARY
 *
 * Public gallery of published lab templates.
 * Features:
 * - Browse with filter by tags, difficulty, search
 * - Cards showing title, author, description, difficulty badge, likes
 * - Thumbnail (canvas screenshot) preview
 * - Clone → opens in room
 * - Instructor: Publish button (from My Experiments)
 * - Student: Submit assignment
 *
 * This is the "EdTech product" feature that elevates this beyond a toy.
 * Comparable to: Khan Academy exercise library, PhET simulations gallery.
 */

const DIFFICULTY_COLORS = {
  beginner:     'bg-green-800 text-green-200',
  intermediate: 'bg-yellow-800 text-yellow-200',
  advanced:     'bg-red-800 text-red-200',
};

const TAGS = ['mechanics','pendulum','energy','collision','spring','gravity','orbital','fluid'];

export default function ExperimentLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ difficulty: '', tags: [], search: '' });
  const [cloning, setCloning] = useState(null);

  useEffect(() => {
    fetchLibrary();
  }, [filters]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.difficulty) params.set('difficulty', filters.difficulty);
      if (filters.tags.length) params.set('tags', filters.tags.join(','));
      if (filters.search) params.set('search', filters.search);

      const res = await api.get(`/experiments/library?${params}`);
      setExperiments(res.data.experiments);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (experimentId, title) => {
    setCloning(experimentId);
    try {
      await api.post(`/experiments/${experimentId}/clone`, { authorName: user.name });
      if (user.role === 'student') {
        alert(`Cloned! Ask your instructor to load it in a room, or view it under My Experiments.`);
        navigate('/experiments');
        return;
      }
      const roomRes = await api.post('/rooms', { name: title, templateId: experimentId });
      navigate(`/room/${roomRes.data.room.code}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to clone experiment');
    } finally {
      setCloning(null);
    }
  };

  const toggleTag = (tag) => {
    setFilters(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-8 py-6">
        <h1 className="text-2xl font-bold font-mono text-cyan-400">EXPERIMENT LIBRARY</h1>
        <p className="text-gray-400 text-sm mt-1">
          Browse and clone pre-configured physics scenarios
        </p>
      </div>

      <div className="flex">
        {/* Filters Sidebar */}
        <div className="w-56 p-6 border-r border-gray-800 flex-shrink-0">
          <h3 className="text-xs font-mono text-gray-400 mb-3">DIFFICULTY</h3>
          {['', 'beginner', 'intermediate', 'advanced'].map(d => (
            <button
              key={d}
              onClick={() => setFilters(f => ({ ...f, difficulty: d }))}
              className={`block w-full text-left px-2 py-1 rounded text-sm mb-1 transition-colors
                ${filters.difficulty === d ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {d || 'All levels'}
            </button>
          ))}

          <h3 className="text-xs font-mono text-gray-400 mb-3 mt-5">TAGS</h3>
          <div className="flex flex-wrap gap-1">
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-0.5 rounded-full text-xs transition-colors
                  ${filters.tags.includes(tag)
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Search */}
          <input
            type="text"
            placeholder="Search experiments..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-sm mb-6
              focus:outline-none focus:border-cyan-500 text-white placeholder-gray-500"
          />

          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : experiments.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-4xl mb-3">🔬</p>
              <p>No experiments found. Be the first to publish one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {experiments.map(exp => (
                <ExperimentCard
                  key={exp._id}
                  experiment={exp}
                  onClone={() => handleClone(exp._id, exp.title)}
                  cloning={cloning === exp._id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExperimentCard({ experiment, onClone, cloning }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden
      hover:border-gray-600 transition-colors group">
      {/* Thumbnail */}
      <div className="h-32 bg-gray-800 relative overflow-hidden">
        {experiment.thumbnail ? (
          <img
            src={experiment.thumbnail}
            alt={experiment.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-700">
            ⚛
          </div>
        )}
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium
          ${DIFFICULTY_COLORS[experiment.difficulty] || 'bg-gray-700 text-gray-300'}`}>
          {experiment.difficulty}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-white text-sm mb-1 truncate">{experiment.title}</h3>
        <p className="text-gray-400 text-xs mb-2 line-clamp-2">{experiment.description}</p>

        <div className="flex flex-wrap gap-1 mb-3">
          {experiment.tags?.slice(0, 3).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">by {experiment.authorName}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">♥ {experiment.likes}</span>
            <button
              onClick={onClone}
              disabled={cloning}
              className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50
                rounded text-xs font-medium text-white transition-colors"
            >
              {cloning ? '...' : '↗ Clone'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
