import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import PhysicsCanvas from '../components/Canvas/PhysicsCanvas';

export default function RoomPage() {
  const { roomCode } = useParams();
  const { user }     = useAuth();
  const { socket, joinRoom } = useSocket();
  const navigate     = useNavigate();

  const [room,    setRoom]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const loadRoom = async () => {
      try {
        const res = await api.get(`/rooms/${roomCode}`);
        setRoom(res.data.room);
        if (socket && user) joinRoom(roomCode, user.name);
      } catch (err) {
        setError(err.response?.data?.error || 'Room not found');
      } finally { setLoading(false); }
    };
    loadRoom();
  }, [roomCode, socket]);

  useEffect(() => {
    if (!socket) return;
    socket.on('room_joined', ({ room: r }) => setRoom(prev => prev ? {...prev,...r} : r));
    socket.on('error', ({ message }) => setError(message));
    return () => { socket.off('room_joined'); socket.off('error'); };
  }, [socket]);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#020817', display:'flex',
      alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{
        width:48, height:48, borderRadius:'50%',
        border:'3px solid rgba(6,182,212,0.2)',
        borderTop:'3px solid #06b6d4',
        animation:'spin 1s linear infinite',
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign:'center' }}>
        <p style={{ color:'#06b6d4', fontFamily:'monospace', fontSize:14, margin:'0 0 4px', fontWeight:600 }}>
          Joining room {roomCode}...
        </p>
        <p style={{ color:'#334155', fontSize:12, margin:0 }}>Syncing physics state</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100vh', background:'#020817', display:'flex',
      alignItems:'center', justifyContent:'center' }}>
      <div style={{
        textAlign:'center',
        background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.15)',
        borderRadius:20, padding:'40px 48px',
      }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🚫</div>
        <p style={{ color:'#fca5a5', fontSize:16, fontWeight:600, margin:'0 0 8px' }}>{error}</p>
        <p style={{ color:'#64748b', fontSize:13, margin:'0 0 24px' }}>
          The room may not exist or may be locked
        </p>
        <button onClick={() => navigate('/dashboard')} style={{
          background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:10, padding:'10px 24px', color:'white',
          fontSize:13, fontWeight:600, cursor:'pointer',
        }}>← Back to Dashboard</button>
      </div>
    </div>
  );

  return <PhysicsCanvas room={room} />;
}