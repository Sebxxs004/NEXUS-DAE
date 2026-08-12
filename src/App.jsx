import React, { useState, useEffect } from 'react';
import useAuthStore from './store/useAuthStore';
import LoginPage from './pages/LoginPage';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardInvestigator from './pages/DashboardInvestigator';

function App() {
  const { isAuthenticated, usuario, token, restaurarSesion } = useAuthStore();
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    restaurarSesion();
    setSessionRestored(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour in ms
    let timeoutId;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const logout = useAuthStore.getState().logout;
        logout();
        alert("Tu sesión ha expirado tras 1 hora de inactividad.");
      }, INACTIVITY_LIMIT);
    };

    // Listen to user events
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [isAuthenticated]);

  if (!sessionRestored) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-investigation-bg">
        <div className="font-mono text-cyan-300">INICIALIZANDO NEXUS...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (usuario?.rol === 'admin') {
    return <DashboardAdmin />;
  }

  return <DashboardInvestigator token={token} usuario={usuario} />;
}

export default App;

