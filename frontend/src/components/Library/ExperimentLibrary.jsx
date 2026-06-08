import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../context/AuthContext';
import { useAuth } from '../../context/AuthContext';

const TAGS = ['mechanics','pendulum','energy','collision','spring','gravity','orbital','fluid'];

const DIFFICULTY = {
  beginner:     { label:'Beginner',     color:'#34d399', bg:'rgba(52,211,153,0.1)'  },
  intermediate: { label:'Intermediate', color:'#f59e0b', bg:'rgba(245,158,11,0.1)'  },
  advanced:     { label:'Advanced',     color:'#f87171', bg:'rgba(248,113,113,0.1)'  },
};

export default function ExperimentLibrary() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [experiments, setExperiments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [cloning,     setCloning]     = useState(null);
  const [filters,     setFilters]     = useState({ difficulty:'', tags:[], search:'' });

  useEffect(() => { fetchLibrary(); }, [filters]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.difficulty) params.set('difficulty', filters.difficulty);
      if (filters.tags.length) params.set('tags', filters.tags.join(','));
      if (filters.search)     params.set('search', filters.search);
      const res = await api.get(`/experiments/library?${params}`);
      setExperiments(res.data.experiments);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally { setLoading(false); }
  };

  const handleClone = async (experimentId, title) => {
  setCloning(experimentId);
  try {
    if (user.role === 'student') {
      // Student: create a personal room linked to this template
      // so the canvas knows to show "Submit Assignment" instead of "Save"
      const roomRes = await api.post('/rooms', {
        name: `${title} — ${user.name}`,
        templateId: experimentId,
      });
      navigate(`/room/${roomRes.data.room.code}`);
      return;
    }

    // Instructor: clone and open in a new room
    await api.post(`/experiments/${experimentId}/clone`, { authorName: user.name });
    const roomRes = await api.post('/rooms', { name: title, templateId: experimentId });
    navigate(`/room/${roomRes.data.room.code}`);
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to open experiment');
  } finally { setCloning(null); }
};

  const toggleTag = (tag) => setFilters(f => ({
    ...f,
    tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
  }));

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
          <Link to="/dashboard" style={{ color:'#64748b', textDecoration:'none', fontSize:20, marginRight:4 }}>←</Link>
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
        <div style={{ display:'flex', gap:8 }}>
          {[{to:'/dashboard',label:'Dashboard'},{to:'/experiments',label:'My Experiments'}].map(n => (
            <Link key={n.to} to={n.to} style={{
              color:'#64748b', textDecoration:'none', fontSize:13,
              fontWeight:500, padding:'6px 14px', borderRadius:8,
            }}
              onMouseEnter={e=>{ e.currentTarget.style.color='white'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.color='#64748b'; e.currentTarget.style.background='transparent'; }}
            >{n.label}</Link>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        padding:'48px 40px 36px',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        background:'linear-gradient(180deg,rgba(6,182,212,0.04) 0%,transparent 100%)',
      }}>
        <h1 style={{
          margin:'0 0 8px', fontSize:32, fontWeight:800,
          background:'linear-gradient(90deg,white,#94a3b8)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        }}>Experiment Library</h1>
        <p style={{ margin:'0 0 28px', color:'#475569', fontSize:15 }}>
          Browse, clone, and run pre-configured physics scenarios
        </p>

        {/* Search bar */}
        <div style={{ position:'relative', maxWidth:520 }}>
          <span style={{
            position:'absolute', left:16, top:'50%', transform:'translateY(-50%)',
            fontSize:16, color:'#475569',
          }}>🔍</span>
          <input
            type="text"
            placeholder="Search experiments..."
            value={filters.search}
            onChange={e => setFilters(f => ({...f, search:e.target.value}))}
            style={{
              width:'100%', background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:12, padding:'12px 16px 12px 44px',
              color:'white', fontSize:14, outline:'none',
              boxSizing:'border-box', transition:'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor='#06b6d4'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
          />
        </div>
      </div>

      <div style={{ display:'flex' }}>

        {/* Sidebar filters */}
        <div style={{
          width:220, padding:'28px 20px',
          borderRight:'1px solid rgba(255,255,255,0.06)',
          flexShrink:0, position:'sticky', top:60,
          height:'calc(100vh - 60px)', overflowY:'auto',
        }}>
          <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700,
            letterSpacing:1.2, textTransform:'uppercase', color:'#475569' }}>
            Difficulty
          </p>
          {[
            { val:'',             label:'All Levels', color:'#94a3b8' },
            { val:'beginner',     label:'Beginner',     color:'#34d399' },
            { val:'intermediate', label:'Intermediate', color:'#f59e0b' },
            { val:'advanced',     label:'Advanced',     color:'#f87171' },
          ].map(d => (
            <button key={d.val} onClick={() => setFilters(f => ({...f, difficulty:d.val}))} style={{
              display:'flex', alignItems:'center', gap:10,
              width:'100%', padding:'9px 12px', borderRadius:10,
              border:`1px solid ${filters.difficulty===d.val ? d.color+'44' : 'transparent'}`,
              background: filters.difficulty===d.val ? d.color+'11' : 'transparent',
              color: filters.difficulty===d.val ? d.color : '#64748b',
              cursor:'pointer', fontSize:13, fontWeight:500,
              marginBottom:4, textAlign:'left', transition:'all 0.15s',
            }}>
              <span style={{
                width:8, height:8, borderRadius:'50%',
                background: filters.difficulty===d.val ? d.color : '#334155',
                flexShrink:0,
              }}/>
              {d.label}
            </button>
          ))}

          <p style={{ margin:'24px 0 12px', fontSize:11, fontWeight:700,
            letterSpacing:1.2, textTransform:'uppercase', color:'#475569' }}>
            Topics
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {TAGS.map(tag => {
              const active = filters.tags.includes(tag);
              return (
                <button key={tag} onClick={() => toggleTag(tag)} style={{
                  padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:500,
                  border:`1px solid ${active ? '#06b6d4' : 'rgba(255,255,255,0.08)'}`,
                  background: active ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.02)',
                  color: active ? '#06b6d4' : '#64748b',
                  cursor:'pointer', transition:'all 0.15s',
                }}>{tag}</button>
              );
            })}
          </div>

          {(filters.difficulty || filters.tags.length > 0 || filters.search) && (
            <button onClick={() => setFilters({ difficulty:'', tags:[], search:'' })} style={{
              marginTop:24, width:'100%', padding:'8px', borderRadius:10,
              border:'1px solid rgba(239,68,68,0.2)',
              background:'rgba(239,68,68,0.06)',
              color:'#f87171', fontSize:12, fontWeight:600,
              cursor:'pointer',
            }}>✕ Clear Filters</button>
          )}
        </div>

        {/* Main grid */}
        <div style={{ flex:1, padding:'28px 32px' }}>
          {/* Results count */}
          <p style={{ margin:'0 0 20px', fontSize:13, color:'#475569' }}>
            {loading ? 'Searching...' : `${experiments.length} experiment${experiments.length !== 1 ? 's' : ''} found`}
          </p>

          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 }}>
              {[...Array(6)].map((_,i) => (
                <div key={i} style={{
                  height:260, borderRadius:16,
                  background:'rgba(255,255,255,0.02)',
                  border:'1px solid rgba(255,255,255,0.05)',
                  animation:'pulse 1.5s infinite',
                }}/>
              ))}
            </div>
          ) : experiments.length === 0 ? (
            <div style={{
              textAlign:'center', padding:'80px 24px',
              background:'rgba(255,255,255,0.01)',
              border:'1px dashed rgba(255,255,255,0.06)',
              borderRadius:20,
            }}>
              <div style={{ fontSize:56, marginBottom:20 }}>🔬</div>
              <p style={{ color:'#475569', fontSize:16, margin:'0 0 8px', fontWeight:600 }}>
                No experiments found
              </p>
              <p style={{ color:'#334155', fontSize:13, margin:0 }}>
                Try adjusting your filters, or be the first to publish one!
              </p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 }}>
             {experiments.map(exp => (
  <ExperimentCard
    key={exp._id}
    experiment={exp}
    onClone={() => handleClone(exp._id, exp.title)}
    cloning={cloning === exp._id}
    userRole={user?.role}
  />
))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExperimentCard({ experiment, onClone, cloning, userRole }) {
  const [hovered, setHovered] = useState(false);
  const diff = DIFFICULTY[experiment.difficulty];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius:16, overflow:'hidden',
        transition:'all 0.2s', cursor:'default',
        display:'flex', flexDirection:'column',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height:140, background:'linear-gradient(135deg,#0f172a,#1e293b)',
        display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative', overflow:'hidden',
      }}>
        {experiment.thumbnail ? (
          <img src={experiment.thumbnail} alt={experiment.title}
            style={{ width:'100%', height:'100%', objectFit:'cover',
              transform: hovered ? 'scale(1.05)' : 'scale(1)', transition:'transform 0.3s' }}
          />
        ) : (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:48, opacity:0.2 }}>⚛</div>
          </div>
        )}
        {diff && (
          <span style={{
            position:'absolute', top:12, right:12,
            fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20,
            color: diff.color, background: diff.bg,
            backdropFilter:'blur(8px)',
          }}>{diff.label}</span>
        )}
        {/* Hover overlay */}
        {hovered && (
          <div style={{
            position:'absolute', inset:0,
            background:'rgba(6,182,212,0.06)',
            transition:'opacity 0.2s',
          }}/>
        )}
      </div>

      {/* Content */}
      <div style={{ padding:'18px 20px', flex:1, display:'flex', flexDirection:'column' }}>
        <h3 style={{ margin:'0 0 6px', fontSize:15, fontWeight:700,
          color:'white', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {experiment.title}
        </h3>
        <p style={{ margin:'0 0 12px', fontSize:12, color:'#64748b',
          lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2,
          WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {experiment.description || 'No description'}
        </p>

        {/* Tags */}
        {experiment.tags?.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:14 }}>
            {experiment.tags.slice(0,3).map(tag => (
              <span key={tag} style={{
                fontSize:11, padding:'3px 9px', borderRadius:20,
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.08)',
                color:'#64748b',
              }}>{tag}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto' }}>
          <div>
            <p style={{ margin:0, fontSize:11, color:'#475569' }}>
              by {experiment.authorName || 'Unknown'}
            </p>
            <p style={{ margin:'2px 0 0', fontSize:11, color:'#334155' }}>
              ♥ {experiment.likes || 0} likes
            </p>
          </div>
          <button onClick={onClone} disabled={cloning} style={{
            padding:'8px 18px', borderRadius:10, border:'none',
            background: cloning
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg,#0e7490,#6d28d9)',
            color: cloning ? '#64748b' : 'white',
            fontSize:12, fontWeight:700,
            cursor: cloning ? 'not-allowed' : 'pointer',
            transition:'opacity 0.15s',
          }}
            onMouseEnter={e => { if (!cloning) e.currentTarget.style.opacity='0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity='1'; }}
          >
            {cloning ? 'Opening...' : userRole === 'student' ? '📝 Start Assignment' : '↗ Clone'}
          </button>
        </div>
      </div>
    </div>
  );
}