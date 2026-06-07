import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode]   = useState('login');
  const [form, setForm]   = useState({ name:'', email:'', password:'', role:'student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      mode === 'login'
        ? await login(form.email, form.password)
        : await register(form.name, form.email, form.password, form.role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #020817 0%, #0a1628 50%, #020817 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow blobs */}
      <div style={{
        position:'absolute', width:600, height:600, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
        top:-100, left:-100, pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute', width:400, height:400, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        bottom:-50, right:-50, pointerEvents:'none',
      }}/>

      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:1 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:10,
            marginBottom:12,
          }}>
            <div style={{
              width:44, height:44, borderRadius:12,
              background:'linear-gradient(135deg, #06b6d4, #8b5cf6)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:22,
            }}>⚛</div>
            <span style={{
              fontSize:28, fontWeight:800, letterSpacing:2,
              background:'linear-gradient(90deg, #06b6d4, #8b5cf6)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            }}>VIRTUAL-LAB</span>
          </div>
          <p style={{ color:'#475569', fontSize:14, margin:0 }}>
            Collaborative 2D Physics Sandbox
          </p>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(15,23,42,0.8)',
          border:'1px solid rgba(255,255,255,0.06)',
          borderRadius:20, padding:32,
          backdropFilter:'blur(20px)',
          boxShadow:'0 25px 50px rgba(0,0,0,0.5)',
        }}>
          {/* Tab switcher */}
          <div style={{
            display:'flex', background:'#020817', borderRadius:12,
            padding:4, marginBottom:28, border:'1px solid rgba(255,255,255,0.05)',
          }}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
                flex:1, padding:'9px 0', borderRadius:9, border:'none',
                background: mode===m ? 'linear-gradient(135deg,#0e7490,#6d28d9)' : 'transparent',
                color: mode===m ? 'white' : '#64748b',
                cursor:'pointer', fontSize:13, fontWeight:600,
                textTransform:'capitalize', transition:'all 0.2s',
              }}>{m === 'login' ? 'Sign In' : 'Register'}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
            {mode === 'register' && (
              <Field label="Full Name">
                <Input type="text" required placeholder="Your full name"
                  value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
              </Field>
            )}

            <Field label="Email">
              <Input type="email" required placeholder="you@university.edu"
                value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
            </Field>

            <Field label="Password">
              <Input type="password" required minLength={8} placeholder="Min. 8 characters with a number"
                value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} />
            </Field>

            {mode === 'register' && (
              <Field label="I am a...">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    { role:'student',    icon:'🎓', label:'Student' },
                    { role:'instructor', icon:'👨‍🏫', label:'Instructor' },
                  ].map(r => (
                    <button key={r.role} type="button"
                      onClick={() => setForm(f=>({...f,role:r.role}))}
                      style={{
                        padding:'12px 8px', borderRadius:12, border:'2px solid',
                        borderColor: form.role===r.role ? '#06b6d4' : 'rgba(255,255,255,0.06)',
                        background: form.role===r.role ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)',
                        color: form.role===r.role ? '#06b6d4' : '#64748b',
                        cursor:'pointer', fontSize:13, fontWeight:600,
                        display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                        transition:'all 0.2s',
                      }}>
                      <span style={{ fontSize:22 }}>{r.icon}</span>
                      {r.label}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {error && (
              <div style={{
                background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
                borderRadius:10, padding:'10px 14px',
                color:'#fca5a5', fontSize:13,
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              padding:'13px', borderRadius:12, border:'none',
              background: loading ? '#1e293b' : 'linear-gradient(135deg,#0e7490,#6d28d9)',
              color: loading ? '#64748b' : 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize:14, fontWeight:700, marginTop:4,
              transition:'opacity 0.2s', letterSpacing:0.5,
            }}>
              {loading ? 'Please wait...' : mode==='login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', color:'#1e293b', fontSize:12, marginTop:20 }}>
          Matter.js · Socket.io · MongoDB · React
        </p>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div>
    <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:'#475569',
      textTransform:'uppercase', display:'block', marginBottom:7 }}>{label}</label>
    {children}
  </div>
);

const Input = (props) => (
  <input {...props} style={{
    width:'100%', background:'rgba(255,255,255,0.03)',
    border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:10, padding:'11px 14px', fontSize:14,
    color:'white', outline:'none', transition:'border-color 0.2s',
    boxSizing:'border-box',
  }}
    onFocus={e => e.target.style.borderColor='#06b6d4'}
    onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
  />
);