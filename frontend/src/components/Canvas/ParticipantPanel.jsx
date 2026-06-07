export default function ParticipantPanel({ participants }) {
  return (
    <div className="p-3 border-b border-gray-800">
      <h3 className="text-xs font-mono text-gray-400 mb-2">
        ONLINE ({participants.length})
      </h3>
      <div className="flex flex-col gap-1">
        {participants.map(p => (
          <div key={p.userId} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: p.color || '#4ECDC4' }}
            />
            <span className="text-xs text-gray-300 truncate">{p.name}</span>
            <span className="ml-auto text-xs text-gray-600 font-mono">{p.role?.[0]?.toUpperCase()}</span>
          </div>
        ))}
        {participants.length === 0 && (
          <p className="text-xs text-gray-600">Only you here</p>
        )}
      </div>
    </div>
  );
}
