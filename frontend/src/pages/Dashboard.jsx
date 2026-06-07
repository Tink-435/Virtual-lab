import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms,       setRooms]       = useState([]);
  const [joinCode,    setJoinCode]    = useState('');
  const [creating,    setCreating]    = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinError,   setJoinError]   = useState('');

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';

  useEffect(() => {
    if (isInstructor) {
      api.get('/rooms/mine').then(r => setRooms(r.data.rooms)).catch(()=>{});
    }
  }, [user]);

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/rooms', { name: newRoomName });
      navigate(`/room/${res.data.room.code}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create room');
    } finally { setCreating(false); }
  };

  const joinRoom = () => {
    if (!joinCode.trim()) return;
    if (joinCode.trim().length !== 6) { setJoinError('Code must be 6 characters'); return; }
    setJoinError('');
    navigate(`/room/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#020817', color:'white',
      fontFamily:'Inter,-apple-system,sans-serif' }}>

      {/* Nav */}
      <nav style={{
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        padding:'0 32px', height:60,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(2,8,23,0.8)', backdropFilter:'blur(20px)',
        position:'sticky', top:0, zIndex:100,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:32, height:32, borderRadius:8,
            background:'linear-gradient(135deg,#06b6d4,#8b5cf6)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
          }}>⚛</div>
          <span style={{
            fontSize:16, fontWeight:800, letterSpacing:1.5,
            background:'linear-gradient(90deg,#06b6d4,#8b5cf6)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>VIRTUAL-LAB</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {[
            { to:'/library',     label:'Library' },
            { to:'/experiments', label:'My Experiments' },
          ].map(n => (
            <Link key={n.to} to={n.to} style={{
              color:'#64748b', textDecoration:'none', fontSize:13, fontWeight:500,
              padding:'6px 14px', borderRadius:8,
              transition:'all 0.2s',
            }}
              onMouseEnter={e=>{ e.target.style.color='white'; e.target.style.background='rgba(255,255,255,0.05)'; }}
              onMouseLeave={e=>{ e.target.style.color='#64748b'; e.target.style.background='transparent'; }}
            >{n.label}</Link>
          ))}

          <div style={{
            display:'flex', alignItems:'center', gap:10, marginLeft:8,
            padding:'6px 14px', borderRadius:10,
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width:28, height:28, borderRadius:'50%',
              background:'linear-gradient(135deg,#06b6d4,#8b5cf6)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:700,
            }}>{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'white', lineHeight:1.2 }}>{user?.name}</div>
              <div style={{ fontSize:10, color:'#64748b', textTransform:'capitalize' }}>{user?.role}</div>
            </div>
            <button onClick={logout} style={{
              background:'none', border:'none', color:'#475569',
              cursor:'pointer', fontSize:16, marginLeft:4, padding:2,
              borderRadius:6, transition:'color 0.2s',
            }}
              onMouseEnter={e=>e.target.style.color='#ef4444'}
              onMouseLeave={e=>e.target.style.color='#475569'}
              title="Logout"
            >⏻</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'48px 32px' }}>

        {/* Hero greeting */}
        <div style={{ marginBottom:48 }}>
          <h1 style={{ fontSize:32, fontWeight:800, margin:'0 0 8px',
            background:'linear-gradient(90deg,white,#94a3b8)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color:'#475569', margin:0, fontSize:15 }}>
            {isInstructor
              ? 'Create a room and invite your students to start a live physics session.'
              : 'Enter a room code from your instructor to join a live physics session.'}
          </p>
        </div>

        {/* Main action cards */}
        <div style={{ display:'grid', gridTemplateColumns: isInstructor ? '1fr 1fr' : '1fr', gap:20, marginBottom:48, maxWidth: isInstructor ? '100%' : 480 }}>

          {/* Join room — always shown */}
          <Card
            gradient="linear-gradient(135deg,rgba(6,182,212,0.1),rgba(6,182,212,0.03))"
            border="rgba(6,182,212,0.2)"
            icon="🚀" iconBg="linear-gradient(135deg,#0e7490,#0891b2)"
            title="Join a Room"
            subtitle="Enter the 6-character code from your instructor"
          >
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <input
                value={joinCode} maxLength={6}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                onKeyDown={e => e.key==='Enter' && joinRoom()}
                placeholder="X K 9 P 2 Q"
                style={{
                  flex:1, background:'rgba(0,0,0,0.3)',
                  border:`1px solid ${joinError ? '#ef4444' : 'rgba(6,182,212,0.3)'}`,
                  borderRadius:10, padding:'11px 16px',
                  color:'white', fontSize:18, fontWeight:700,
                  fontFamily:'monospace', letterSpacing:6,
                  outline:'none', textAlign:'center',
                }}
              />
              <button onClick={joinRoom} style={{
                background:'linear-gradient(135deg,#0e7490,#0891b2)',
                border:'none', borderRadius:10, padding:'11px 20px',
                color:'white', fontSize:14, fontWeight:700, cursor:'pointer',
                whiteSpace:'nowrap',
              }}>Join →</button>
            </div>
            {joinError && <p style={{ color:'#f87171', fontSize:12, margin:'6px 0 0' }}>{joinError}</p>}
          </Card>

          {/* Create room — instructor only */}
          {isInstructor && (
            <Card
              gradient="linear-gradient(135deg,rgba(139,92,246,0.1),rgba(139,92,246,0.03))"
              border="rgba(139,92,246,0.2)"
              icon="✨" iconBg="linear-gradient(135deg,#6d28d9,#7c3aed)"
              title="Create a Room"
              subtitle="Start a new collaborative physics session"
            >
              <div style={{ display:'flex', gap:10, marginTop:16 }}>
                <input
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && createRoom()}
                  placeholder="e.g. Physics Lab 3A"
                  style={{
                    flex:1, background:'rgba(0,0,0,0.3)',
                    border:'1px solid rgba(139,92,246,0.3)',
                    borderRadius:10, padding:'11px 16px',
                    color:'white', fontSize:14, outline:'none',
                  }}
                />
                <button onClick={createRoom} disabled={creating} style={{
                  background: creating ? '#1e293b' : 'linear-gradient(135deg,#6d28d9,#7c3aed)',
                  border:'none', borderRadius:10, padding:'11px 20px',
                  color: creating ? '#64748b' : 'white',
                  fontSize:14, fontWeight:700,
                  cursor: creating ? 'not-allowed' : 'pointer',
                  whiteSpace:'nowrap',
                }}>{creating ? '...' : 'Create +'}</button>
              </div>
            </Card>
          )}
        </div>

        {/* Quick links for students */}
        {!isInstructor && (
          <div style={{ marginBottom:48 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'#94a3b8', marginBottom:16, letterSpacing:0.5 }}>
              QUICK LINKS
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
              {[
                { to:'/library',     icon:'📚', label:'Experiment Library', desc:'Browse physics templates' },
                { to:'/experiments', icon:'🔬', label:'My Experiments',     desc:'View your saved work' },
              ].map(q => (
                <Link key={q.to} to={q.to} style={{ textDecoration:'none' }}>
                  <div style={{
                    background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)',
                    borderRadius:14, padding:'20px', cursor:'pointer', transition:'all 0.2s',
                  }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; }}
                  >
                    <div style={{ fontSize:28, marginBottom:10 }}>{q.icon}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:'white', marginBottom:4 }}>{q.label}</div>
                    <div style={{ fontSize:12, color:'#64748b' }}>{q.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* My Rooms — instructor */}
        {isInstructor && rooms.length > 0 && (
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, color:'#94a3b8', marginBottom:16, letterSpacing:0.5 }}>
              MY ROOMS
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {rooms.map(room => (
                <div key={room._id} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)',
                  borderRadius:14, padding:'16px 20px', transition:'all 0.2s',
                }}
                  onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{
                      width:40, height:40, borderRadius:10,
                      background:'linear-gradient(135deg,rgba(6,182,212,0.15),rgba(139,92,246,0.15))',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                    }}>🧪</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:'white' }}>{room.name}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
                        <span style={{
                          fontFamily:'monospace', fontSize:12, fontWeight:700,
                          background:'rgba(6,182,212,0.1)', color:'#06b6d4',
                          padding:'2px 8px', borderRadius:6, letterSpacing:2,
                        }}>{room.code}</span>
                        {room.isLocked && <span style={{ fontSize:11, color:'#ef4444' }}>🔒 locked</span>}
                        <span style={{ fontSize:11, color:'#475569' }}>
                          {room.participants?.length || 0} participants
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/room/${room.code}`)} style={{
                    background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.2)',
                    borderRadius:10, padding:'8px 18px', color:'#06b6d4',
                    fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.2s',
                  }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='rgba(6,182,212,0.2)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='rgba(6,182,212,0.1)'; }}
                  >Open →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for instructor with no rooms */}
        {isInstructor && rooms.length === 0 && (
          <div style={{
            textAlign:'center', padding:'48px 24px',
            background:'rgba(255,255,255,0.01)', border:'1px dashed rgba(255,255,255,0.06)',
            borderRadius:20,
          }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🧪</div>
            <p style={{ color:'#475569', fontSize:15, margin:'0 0 8px' }}>No rooms yet</p>
            <p style={{ color:'#334155', fontSize:13, margin:0 }}>
              Create your first room above to start a collaborative session
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable card
const Card = ({ gradient, border, icon, iconBg, title, subtitle, children }) => (
  <div style={{
    background: gradient,
    border: `1px solid ${border}`,
    borderRadius:18, padding:24,
  }}>
    <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:4 }}>
      <div style={{
        width:44, height:44, borderRadius:12, background:iconBg,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:20, flexShrink:0,
      }}>{icon}</div>
      <div>
        <h3 style={{ margin:'0 0 4px', fontSize:17, fontWeight:700, color:'white' }}>{title}</h3>
        <p style={{ margin:0, fontSize:13, color:'#64748b' }}>{subtitle}</p>
      </div>
    </div>
    {children}
  </div>
);