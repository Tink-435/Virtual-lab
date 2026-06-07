/**
 * CHAOS PANEL — Instructor-only dramatic physics events
 *
 * These are classroom-engagement tools. An instructor can:
 * - Flip gravity (great for demonstrating gravitational effects)
 * - Trigger a shockwave (shows impulse/momentum)
 * - Apply random impulses (demonstrates chaos/entropy)
 * - Freeze all bodies (freeze-frame for discussion)
 * - Lock the room (prevent student edits during lecture)
 */
export default function ChaosPanel({ onChaos, onToggleLock, isLocked }) {
  const events = [
    { type: 'gravity_flip',   label: '🔄 Flip Gravity',    color: 'bg-orange-700 hover:bg-orange-600' },
    { type: 'zero_gravity',   label: '🚀 Zero Gravity',    color: 'bg-blue-700 hover:bg-blue-600' },
    { type: 'shockwave',      label: '💥 Shockwave',       color: 'bg-red-700 hover:bg-red-600' },
    { type: 'random_impulse', label: '🌪 Random Impulse',  color: 'bg-purple-700 hover:bg-purple-600' },
    { type: 'freeze_all',     label: '❄ Freeze All',      color: 'bg-cyan-700 hover:bg-cyan-600' },
  ];

  return (
    <div className="p-3 border-b border-gray-800">
      <h3 className="text-xs font-mono text-yellow-400 mb-2">⚡ INSTRUCTOR CONTROLS</h3>

      <button
        onClick={onToggleLock}
        className={`w-full py-1.5 rounded text-xs font-medium mb-2 transition-colors
          ${isLocked
            ? 'bg-red-800 hover:bg-red-700 text-red-200'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
      >
        {isLocked ? '🔒 Unlock Room' : '🔓 Lock Room'}
      </button>

      <div className="flex flex-col gap-1">
        {events.map(ev => (
          <button
            key={ev.type}
            onClick={() => onChaos(ev.type, { cx: 600, cy: 350, strength: 0.08 })}
            className={`w-full py-1.5 rounded text-xs font-medium transition-colors text-white ${ev.color}`}
          >
            {ev.label}
          </button>
        ))}
      </div>
    </div>
  );
}
