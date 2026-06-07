import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AuthPage from './components/Auth/AuthPage';
import ExperimentLibrary from './components/Library/ExperimentLibrary';
import Dashboard from './pages/Dashboard';
import RoomPage from './pages/RoomPage';
import MyExperiments from './pages/MyExperiments';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#030712', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'#38BDF8', fontFamily:'monospace', fontSize:16 }}>Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<AuthPage />} />

            {/* Root → dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Protected */}
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/library" element={
              <ProtectedRoute><ExperimentLibrary /></ProtectedRoute>
            } />
            <Route path="/room/:roomCode" element={
              <ProtectedRoute><RoomPage /></ProtectedRoute>
            } />
            <Route path="/experiments" element={
              <ProtectedRoute><MyExperiments /></ProtectedRoute>
            } />

            {/* 404 */}
            <Route path="*" element={
              <div style={{ minHeight:'100vh', background:'#030712', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>
                <div style={{ textAlign:'center' }}>
                  <p style={{ fontSize:60, fontFamily:'monospace', color:'#1E293B', margin:'0 0 12px' }}>404</p>
                  <p style={{ color:'#64748B' }}>Page not found</p>
                  <a href="/dashboard" style={{ color:'#38BDF8', fontSize:14 }}>← Go to Dashboard</a>
                </div>
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
