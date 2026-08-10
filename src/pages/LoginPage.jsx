import React, { useState } from 'react';
import useAuthStore from '../store/useAuthStore';
import fgnLogo from '../assets/fgn-logo.png';
import nexusLogo from '../assets/NEXUS-DAE.png';
import fondoLogin from '../assets/fondo-login.png';

function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const { login, loading } = useAuthStore();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const success = await login(formData.email, formData.password);
    if (!success) {
      setError('Email o contraseña inválidos');
    }
  };

  return (
    <div 
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat text-slate-100"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(10, 15, 22, 0.9) 0%, rgba(10, 15, 22, 0.7) 100%), url(${fondoLogin})`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.06),transparent_70%)]" />

      <div className="relative z-10 w-full max-w-[440px] rounded-2xl border border-white/10 bg-panel-dark/60 p-6 shadow-2xl backdrop-blur-xl md:p-8 my-auto">
        <div className="flex flex-col items-center text-center space-y-4">
          
          <img
            src={nexusLogo}
            alt="Logo NEXUS DAE"
            className="h-16 w-auto drop-shadow-[0_0_15px_rgba(0,240,255,0.2)]"
          />

          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-cyan-300/90">
              NEXUS DAE
            </p>
            <h1 className="font-mono text-base font-semibold uppercase tracking-[0.1em] text-slate-50">
              Actividad de simulación interactiva de Despacho Fiscal
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
            {error && (
              <div className="rounded-lg border border-orange-500/50 bg-orange-500/10 px-3 py-1.5 text-xs text-orange-300">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="email" className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@nexus.dae"
                disabled={loading}
                className="w-full rounded-lg border border-cyan-500/20 bg-slate-950/60 px-4 py-2.5 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-500 disabled:opacity-50 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="admin123"
                disabled={loading}
                className="w-full rounded-lg border border-cyan-500/20 bg-slate-950/60 px-4 py-2.5 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-500 disabled:opacity-50 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 font-mono text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200 transition disabled:opacity-50 hover:bg-cyan-500/20 hover:text-white"
            >
              {loading ? 'INGRESANDO...' : 'Ingresar al simulador'}
            </button>
          </form>

          <div className="w-full pt-2">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent mb-3" />
            <img
              src={fgnLogo}
              alt="Logo FGN"
              className="h-9 w-auto mx-auto opacity-75 drop-shadow-[0_0_10px_rgba(0,240,255,0.08)]"
            />
          </div>

        </div>
      </div>
    </div>
  );
}

export default LoginPage;
