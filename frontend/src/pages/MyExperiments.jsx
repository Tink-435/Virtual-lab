import { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const S = {
  page: {
    minHeight: '100vh', background: '#020817',
    color: 'white', fontFamily: 'Inter,-apple-system,sans-serif',
  },
  nav: {
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    padding: '0 32px', height: 60,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'rgba(2,8,23,0.8)', backdropFilter: 'blur(20px)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  logo: {
    fontSize: 16, fontWeight: 800, letterSpacing: 1.5,
    background: 'linear-gradient(90deg,#06b6d4,#8b5cf6)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  body: {
    display: 'flex', height: 'calc(100vh - 60px)',
  },
  sidebar: {
    width: 300, borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column', flexShrink: 0,
  },
  sidebarHeader: {
    padding: '24px 24px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  detail: {
    flex: 1, overflowY: 'auto', padding: 40,
  },
};

export default function MyExperiments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [experiments,  setExperiments]  = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [submissions,  setSubmissions]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [publishModal, setPublishModal] = useState(null);
  const [publishForm,  setPublishForm]  = useState({ instructions:'', rubric:'', isPublic:false });
  const [publishing,   setPublishing]   = useState(false);

  useEffect(() => {
    api.get('/experiments/mine')
      .then(r => setExperiments(r.data.experiments))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (exp) => {
    setSelected(exp);
    setSubmissions([]);
    if (user.role === 'instructor' && exp.type === 'template') {
      const res = await api.get(`/experiments/${exp._id}`);
      setSubmissions(res.data.experiment.submissions || []);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await api.post(`/experiments/${publishModal._id}/publish`, publishForm);
      setExperiments(prev => prev.map(e =>
        e._id === publishModal._id ? { ...e, isPublished: true } : e
      ));
      if (selected?._id === publishModal._id) {
        setSelected(prev => ({ ...prev, isPublished: true }));
      }
      setPublishModal(null);
    } catch { alert('Failed to publish'); }
    finally { setPublishing(false); }
  };

  const handleGrade = async (expId, subId, grade, feedback) => {
    await api.patch(`/experiments/${expId}/submissions/${subId}/grade`, { grade, feedback });
    const res = await api.get(`/experiments/${expId}`);
    setSubmissions(res.data.experiment.submissions || []);
  };

  const typeConfig = {
    personal:   { label: 'Personal',   color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
    template:   { label: 'Template',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
    submission: { label: 'Submission', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'   },
  };

  return (
    <div style={S.page}>
      {/* Nav */}
      <nav style={S.nav}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Link to="/dashboard" style={{ color:'#64748b', textDecoration:'none', fontSize:20, marginRight:4 }}>←</Link>
          <div style={{
            width:32, height:32, borderRadius:8,
            background:'linear-gradient(135deg,#06b6d4,#8b5cf6)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
          }}>⚛</div>
          <span style={S.logo}>VIRTUAL-LAB</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/library">Library</NavLink>
        </div>
      </nav>

      <div style={S.body}>
        {/* Sidebar */}
        <div style={S.sidebar}>
          <div style={S.sidebarHeader}>
            <h2 style={{ margin:0, fontSize:18, fontWeight:800,
              background:'linear-gradient(90deg,white,#94a3b8)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              My Experiments
            </h2>
            <p style={{ margin:'4px 0 0', fontSize:12, color:'#475569' }}>
              {loading ? 'Loading...' : `${experiments.length} saved`}
            </p>
          </div>

          <div style={{ flex:1, overflowY:'auto' }}>
            {loading ? (
              <div style={{ padding:24 }}>
                {[...Array(4)].map((_,i) => (
                  <div key={i} style={{
                    height:64, borderRadius:12, marginBottom:8,
                    background:'rgba(255,255,255,0.03)',
                    animation:'pulse 1.5s infinite',
                  }}/>
                ))}
              </div>
            ) : experiments.length === 0 ? (
              <div style={{ padding:40, textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:16 }}>🔬</div>
                <p style={{ color:'#475569', fontSize:14, margin:'0 0 8px' }}>No experiments yet</p>
                <p style={{ color:'#334155', fontSize:12, margin:0 }}>
                  Run a simulation and hit Save to Library
                </p>
              </div>
            ) : (
              <div style={{ padding:'8px 12px' }}>
                {experiments.map(exp => {
                  const tc = typeConfig[exp.type] || typeConfig.personal;
                  const isActive = selected?._id === exp._id;
                  return (
                    <div key={exp._id} onClick={() => handleSelect(exp)} style={{
                      padding:'12px 14px', borderRadius:12, marginBottom:6,
                      cursor:'pointer', transition:'all 0.15s',
                      background: isActive
                        ? 'rgba(6,182,212,0.08)'
                        : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isActive
                        ? 'rgba(6,182,212,0.25)'
                        : 'rgba(255,255,255,0.05)'}`,
                    }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                        <span style={{
                          fontSize:10, fontWeight:700, letterSpacing:0.5,
                          padding:'2px 8px', borderRadius:20,
                          color: tc.color, background: tc.bg,
                        }}>{tc.label}</span>
                        {exp.isPublished && (
                          <span style={{ fontSize:10, color:'#34d399', display:'flex', alignItems:'center', gap:3 }}>
                            ✓ Published
                          </span>
                        )}
                      </div>
                      <p style={{ margin:0, fontSize:13, fontWeight:600, color:'white',
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {exp.title}
                      </p>
                      <p style={{ margin:'4px 0 0', fontSize:11, color:'#475569' }}>
                        v{exp.currentVersion} · {new Date(exp.updatedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div style={S.detail}>
          {!selected ? (
            <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:64, marginBottom:16, opacity:0.3 }}>🔬</div>
                <p style={{ color:'#334155', fontSize:15, margin:0 }}>
                  Select an experiment from the list
                </p>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth:720 }}>

              {/* Header */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:32 }}>
                <div>
                  <h2 style={{ margin:'0 0 6px', fontSize:24, fontWeight:800 }}>{selected.title}</h2>
                  {selected.description && (
                    <p style={{ margin:0, color:'#64748b', fontSize:14 }}>{selected.description}</p>
                  )}
                </div>
                <div style={{ display:'flex', gap:10, flexShrink:0, marginLeft:24 }}>
                  <ActionBtn
                    onClick={() => navigate(`/room/new?experimentId=${selected._id}`)}
                    color="#06b6d4"
                  >Open in Lab →</ActionBtn>
                  {user.role === 'instructor' && !selected.isPublished && (
                    <ActionBtn
                      onClick={() => setPublishModal(selected)}
                      color="#f59e0b"
                    >Publish as Template</ActionBtn>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:28 }}>
                {[
                  { label:'Version',  value:`v${selected.currentVersion}` },
                  { label:'Type',     value: selected.type },
                  { label:'Last Updated', value: new Date(selected.updatedAt).toLocaleDateString() },
                ].map(s => (
                  <div key={s.label} style={{
                    background:'rgba(255,255,255,0.02)',
                    border:'1px solid rgba(255,255,255,0.06)',
                    borderRadius:14, padding:'16px 20px',
                  }}>
                    <p style={{ margin:'0 0 4px', fontSize:11, color:'#475569',
                      textTransform:'uppercase', letterSpacing:1, fontWeight:700 }}>{s.label}</p>
                    <p style={{ margin:0, fontSize:16, fontWeight:700, color:'white',
                      textTransform:'capitalize' }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Version History */}
              <Section title="Version History" icon="🕐">
                <div style={{ display:'flex', alignItems:'center', gap:8, overflowX:'auto', paddingBottom:8 }}>
                  {Array.from({ length: selected.currentVersion }, (_,i) => i+1).map(v => (
                    <div key={v} style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                      <div style={{
                        padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700,
                        fontFamily:'monospace', cursor:'pointer', transition:'all 0.15s',
                        background: v === selected.currentVersion
                          ? 'linear-gradient(135deg,#0e7490,#6d28d9)'
                          : 'rgba(255,255,255,0.04)',
                        color: v === selected.currentVersion ? 'white' : '#64748b',
                        border: `1px solid ${v === selected.currentVersion
                          ? 'transparent'
                          : 'rgba(255,255,255,0.06)'}`,
                      }}>
                        v{v}{v === selected.currentVersion ? ' ← current' : ''}
                      </div>
                      {v < selected.currentVersion && (
                        <span style={{ color:'#1e293b', fontSize:16 }}>→</span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>

              {/* Submissions — instructor only */}
              {user.role === 'instructor' && selected.type === 'template' && (
                <Section title={`Student Submissions (${submissions.length})`} icon="📋">
                  {submissions.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'32px 0' }}>
                      <div style={{ fontSize:40, marginBottom:12, opacity:0.4 }}>📭</div>
                      <p style={{ color:'#475569', fontSize:14, margin:0 }}>No submissions yet</p>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      {submissions.map(sub => (
                        <SubmissionRow
                          key={sub._id}
                          sub={sub}
                          onGrade={(grade, feedback) => handleGrade(selected._id, sub._id, grade, feedback)}
                        />
                      ))}
                    </div>
                  )}
                </Section>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Publish Modal */}
      {publishModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:200, padding:24, backdropFilter:'blur(4px)',
        }}>
          <div style={{
            background:'#0f172a', border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:20, width:'100%', maxWidth:520, padding:32,
            boxShadow:'0 25px 50px rgba(0,0,0,0.6)',
          }}>
            <h3 style={{ margin:'0 0 6px', fontSize:20, fontWeight:800 }}>
              Publish Template
            </h3>
            <p style={{ margin:'0 0 24px', color:'#64748b', fontSize:14 }}>
              "{publishModal.title}" will be visible to students
            </p>

            <ModalLabel>Instructions for Students</ModalLabel>
            <ModalTextarea
              value={publishForm.instructions}
              onChange={e => setPublishForm(f => ({...f, instructions:e.target.value}))}
              rows={4}
              placeholder="Describe what students should do in this experiment..."
            />

            <ModalLabel>Grading Rubric</ModalLabel>
            <ModalTextarea
              value={publishForm.rubric}
              onChange={e => setPublishForm(f => ({...f, rubric:e.target.value}))}
              rows={3}
              placeholder="e.g. 20pts: energy conservation shown, 30pts: correct constraint setup..."
            />

            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:24 }}>
              <input
                type="checkbox"
                checked={publishForm.isPublic}
                onChange={e => setPublishForm(f => ({...f, isPublic:e.target.checked}))}
                style={{ width:16, height:16, accentColor:'#06b6d4' }}
              />
              <span style={{ fontSize:14, color:'#94a3b8' }}>
                Make publicly visible in the Experiment Library
              </span>
            </label>

            <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
              <button onClick={() => setPublishModal(null)} style={{
                padding:'10px 20px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)',
                background:'transparent', color:'#64748b', cursor:'pointer', fontSize:13, fontWeight:600,
              }}>Cancel</button>
              <button onClick={handlePublish} disabled={publishing} style={{
                padding:'10px 24px', borderRadius:10, border:'none',
                background: publishing ? '#1e293b' : 'linear-gradient(135deg,#d97706,#b45309)',
                color: publishing ? '#64748b' : 'white',
                cursor: publishing ? 'not-allowed' : 'pointer',
                fontSize:13, fontWeight:700,
              }}>{publishing ? 'Publishing...' : 'Publish →'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

const NavLink = ({ to, children }) => (
  <Link to={to} style={{
    color:'#64748b', textDecoration:'none', fontSize:13, fontWeight:500,
    padding:'6px 14px', borderRadius:8,
  }}
    onMouseEnter={e => { e.currentTarget.style.color='white'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
    onMouseLeave={e => { e.currentTarget.style.color='#64748b'; e.currentTarget.style.background='transparent'; }}
  >{children}</Link>
);

const ActionBtn = ({ onClick, color, children }) => (
  <button onClick={onClick} style={{
    padding:'9px 18px', borderRadius:10, border:'none',
    background:`${color}18`, color, fontSize:13, fontWeight:700,
    cursor:'pointer', transition:'all 0.15s',
    border:`1px solid ${color}33`,
  }}
    onMouseEnter={e => { e.currentTarget.style.background=`${color}30`; }}
    onMouseLeave={e => { e.currentTarget.style.background=`${color}18`; }}
  >{children}</button>
);

const Section = ({ title, icon, children }) => (
  <div style={{
    background:'rgba(255,255,255,0.02)',
    border:'1px solid rgba(255,255,255,0.06)',
    borderRadius:16, padding:24, marginBottom:20,
  }}>
    <h3 style={{ margin:'0 0 16px', fontSize:13, fontWeight:700,
      color:'#94a3b8', textTransform:'uppercase', letterSpacing:1,
      display:'flex', alignItems:'center', gap:8 }}>
      <span>{icon}</span>{title}
    </h3>
    {children}
  </div>
);

const ModalLabel = ({ children }) => (
  <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:700,
    letterSpacing:1, textTransform:'uppercase', color:'#475569' }}>
    {children}
  </p>
);

const ModalTextarea = (props) => (
  <textarea {...props} style={{
    width:'100%', background:'rgba(255,255,255,0.03)',
    border:'1px solid rgba(255,255,255,0.08)', borderRadius:10,
    padding:'10px 14px', fontSize:13, color:'white',
    outline:'none', resize:'none', marginBottom:20,
    fontFamily:'inherit', boxSizing:'border-box',
  }}
    onFocus={e => e.target.style.borderColor='#06b6d4'}
    onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
  />
);

function SubmissionRow({ sub, onGrade }) {
  const [editing,  setEditing]  = useState(false);
  const [grade,    setGrade]    = useState(sub.grade ?? '');
  const [feedback, setFeedback] = useState(sub.feedback || '');

  const isGraded = sub.status === 'graded';

  return (
    <div style={{
      background:'rgba(255,255,255,0.02)',
      border:'1px solid rgba(255,255,255,0.06)',
      borderRadius:14, padding:20, transition:'border-color 0.15s',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:36, height:36, borderRadius:'50%',
            background:'linear-gradient(135deg,#06b6d4,#8b5cf6)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:14, fontWeight:700,
          }}>{sub.studentName?.[0]?.toUpperCase()}</div>
          <div>
            <p style={{ margin:0, fontSize:14, fontWeight:600 }}>{sub.studentName}</p>
            <p style={{ margin:0, fontSize:11, color:'#475569' }}>
              {new Date(sub.submittedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {isGraded && sub.grade !== undefined && (
            <span style={{
              fontSize:18, fontWeight:800,
              background:'linear-gradient(90deg,#06b6d4,#8b5cf6)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            }}>{sub.grade}<span style={{ fontSize:12, color:'#475569', WebkitTextFillColor:'#475569' }}>/100</span></span>
          )}
          <span style={{
            fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
            background: isGraded ? 'rgba(52,211,153,0.1)' : 'rgba(245,158,11,0.1)',
            color: isGraded ? '#34d399' : '#f59e0b',
          }}>{isGraded ? 'Graded' : 'Pending'}</span>
          <button onClick={() => setEditing(e => !e)} style={{
            padding:'5px 14px', borderRadius:8,
            background:'rgba(255,255,255,0.05)',
            border:'1px solid rgba(255,255,255,0.08)',
            color:'white', fontSize:12, cursor:'pointer', fontWeight:500,
          }}>{editing ? 'Cancel' : isGraded ? 'Edit Grade' : 'Grade'}</button>
        </div>
      </div>

      {sub.feedback && !editing && (
        <p style={{ margin:'8px 0 0', fontSize:12, color:'#64748b',
          fontStyle:'italic', paddingLeft:48 }}>"{sub.feedback}"</p>
      )}

      {editing && (
        <div style={{
          marginTop:16, padding:16, borderRadius:12,
          background:'rgba(255,255,255,0.02)',
          border:'1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <label style={{ fontSize:12, color:'#64748b', width:60 }}>Grade</label>
            <input type="number" min="0" max="100" value={grade}
              onChange={e => setGrade(e.target.value)}
              style={{
                width:70, background:'rgba(255,255,255,0.05)',
                border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:8, padding:'6px 10px', color:'white',
                fontSize:14, fontWeight:700, outline:'none',
              }}
            />
            <span style={{ color:'#475569', fontSize:13 }}>/ 100</span>
          </div>
          <div style={{ display:'flex', gap:12, marginBottom:12 }}>
            <label style={{ fontSize:12, color:'#64748b', width:60, paddingTop:8 }}>Feedback</label>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
              rows={2} placeholder="Great work on the energy conservation..."
              style={{
                flex:1, background:'rgba(255,255,255,0.05)',
                border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:8, padding:'8px 12px', color:'white',
                fontSize:13, outline:'none', resize:'none', fontFamily:'inherit',
              }}
              onFocus={e => e.target.style.borderColor='#06b6d4'}
              onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}
            />
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => { onGrade(Number(grade), feedback); setEditing(false); }} style={{
              padding:'8px 20px', borderRadius:10, border:'none',
              background:'linear-gradient(135deg,#059669,#047857)',
              color:'white', fontSize:13, fontWeight:700, cursor:'pointer',
            }}>Save Grade ✓</button>
          </div>
        </div>
      )}
    </div>
  );
}