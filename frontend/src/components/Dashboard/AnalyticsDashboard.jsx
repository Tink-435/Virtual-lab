import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

/**
 * ANALYTICS DASHBOARD
 *
 * Renders live physics analytics using Recharts.
 * Data flows: Physics Worker → ANALYTICS message → usePhysics → here
 *
 * Panels:
 * 1. Energy Conservation Graph
 *    - KE (Kinetic Energy) = ½mv² — goes up as bodies speed up
 *    - PE (Potential Energy) = mgh — goes up as bodies rise
 *    - Total = KE + PE — should stay roughly constant (energy conservation!)
 *    This is a real physics teaching tool: students visually verify
 *    the law of conservation of energy.
 *
 * 2. Per-Body Speed Chart
 *    - Line per selected body showing speed over time
 *
 * 3. Force Vectors (shown on canvas as arrows, not here)
 *    - Handled by the canvas drawBody function
 *
 * Why Recharts?
 * - Built for React (no manual D3 DOM manipulation)
 * - ResponsiveContainer handles resize
 * - Built-in animation for streaming data
 */

const COLORS = ['#4ECDC4','#FF6B6B','#45B7D1','#FFEAA7','#DDA0DD','#96CEB4'];

export default function AnalyticsDashboard({ data, bodies }) {
  if (!data || data.length === 0) {
    return (
      <div className="p-3">
        <h3 className="text-xs font-mono text-gray-400 mb-2">📊 ANALYTICS</h3>
        <p className="text-xs text-gray-600">Start simulation to see live data.</p>
      </div>
    );
  }

  // Prepare energy data — last 60 data points for the chart
  const energyData = data.slice(-60).map((d, i) => ({
    tick: i,
    KE: parseFloat(d.totalKE?.toFixed(3) || 0),
    PE: parseFloat(d.totalPE?.toFixed(3) || 0),
    Total: parseFloat(((d.totalKE || 0) + (d.totalPE || 0)).toFixed(3)),
  }));

  // Per-body speed data (first 4 bodies max)
  const trackedBodies = bodies.slice(0, 4);
  const speedData = data.slice(-60).map((d, i) => {
    const row = { tick: i };
    for (const body of trackedBodies) {
      const bd = d.bodies?.find(b => b.id === body.id);
      if (bd) row[body.id] = parseFloat(bd.speed?.toFixed(2) || 0);
    }
    return row;
  });

  return (
    <div className="p-3 flex flex-col gap-4">
      <h3 className="text-xs font-mono text-gray-400">📊 LIVE ANALYTICS</h3>

      {/* Energy Conservation Chart */}
      <div>
        <p className="text-xs text-gray-500 mb-1 font-mono">ENERGY (J)</p>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={energyData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="tick" tick={{ fontSize: 9, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', fontSize: 10 }}
              labelFormatter={v => `Tick ${v}`}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="KE" stroke="#FF6B6B" dot={false} strokeWidth={1.5} name="Kinetic" />
            <Line type="monotone" dataKey="PE" stroke="#45B7D1" dot={false} strokeWidth={1.5} name="Potential" />
            <Line type="monotone" dataKey="Total" stroke="#4ECDC4" dot={false} strokeWidth={1.5}
              strokeDasharray="4 2" name="Total" />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-600 mt-1 italic">
          Total ≈ constant = energy conservation ✓
        </p>
      </div>

      {/* Per-body speed */}
      {trackedBodies.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1 font-mono">SPEED (px/tick)</p>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={speedData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="tick" tick={{ fontSize: 9, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', fontSize: 10 }}
              />
              {trackedBodies.map((body, i) => (
                <Line
                  key={body.id}
                  type="monotone"
                  dataKey={body.id}
                  stroke={COLORS[i % COLORS.length]}
                  dot={false}
                  strokeWidth={1.5}
                  name={body.id.slice(0, 8)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Instantaneous stats table */}
      <div>
        <p className="text-xs text-gray-500 mb-1 font-mono">CURRENT STATE</p>
        <div className="text-xs font-mono text-gray-400 space-y-1">
          {bodies.slice(0, 5).map(b => (
            <div key={b.id} className="flex justify-between">
              <span className="text-gray-500">{b.id.slice(0,10)}</span>
              <span>v={b.speed?.toFixed(1) || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
