/**
 * TOOL PANEL
 * Left sidebar for selecting what to add to the canvas.
 * Tools: select, circle, rectangle, polygon
 * Constraints: rope, spring, pivot, motor
 */
export default function ToolPanel({ activeTool, onToolChange, isLocked, userRole }) {
  const isStudent = userRole === 'student';

  const bodyTools = [
    { id: 'select',    icon: '↖',  label: 'Select' },
    { id: 'circle',    icon: '⬤',  label: 'Circle' },
    { id: 'rectangle', icon: '▬',  label: 'Rectangle' },
    { id: 'polygon',   icon: '⬡',  label: 'Polygon' },
  ];

  const constraintTools = [
    { id: 'rope',    icon: '〰',  label: 'Rope' },
    { id: 'spring',  icon: '⫷',  label: 'Spring' },
    { id: 'pivot',   icon: '⊕',  label: 'Pivot' },
    { id: 'motor',   icon: '⚙',  label: 'Motor' },
  ];

  return (
    <div className="w-16 flex flex-col items-center py-4 gap-1 bg-gray-900 border-r border-gray-800">
      <p className="text-gray-600 text-xs mb-2 font-mono">TOOLS</p>

      {bodyTools.map(tool => (
        <button
          key={tool.id}
          title={`${tool.label}${isLocked && isStudent ? ' (Locked)' : ''}`}
          disabled={isLocked && isStudent && tool.id !== 'select'}
          onClick={() => onToolChange(tool.id)}
          className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all
            ${activeTool === tool.id
              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'}
            disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          {tool.icon}
        </button>
      ))}

      <div className="w-8 border-t border-gray-700 my-2" />
      <p className="text-gray-600 text-xs mb-1 font-mono">JOINTS</p>

      {constraintTools.map(tool => (
        <button
          key={tool.id}
          title={tool.label}
          disabled={isLocked && isStudent}
          onClick={() => onToolChange(tool.id)}
          className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all
            ${activeTool === tool.id
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'}
            disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}
