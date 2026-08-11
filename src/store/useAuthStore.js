import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : (import.meta.env.VITE_API_URL || '/api');

const useAuthStore = create((set, get) => ({
  usuario: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { token, usuario } = response.data;

      set({
        token,
        usuario,
        isAuthenticated: true,
        loading: false,
      });

      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));

      return true;
    } catch (err) {
      const message = err.response?.data?.error || 'Error en login';
      set({ error: message, loading: false });
      return false;
    }
  },

  logout: () => {
    set({
      usuario: null,
      token: null,
      isAuthenticated: false,
    });
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  },

  completarPrimeraVez: async () => {
    const { token, usuario } = get();
    if (!token || !usuario) return;
    try {
      await axios.post(`${API_URL}/auth/complete-first-login`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const nuevoUsuario = { ...usuario, primera_vez: false };
      set({ usuario: nuevoUsuario });
      localStorage.setItem('usuario', JSON.stringify(nuevoUsuario));
    } catch (e) {
      console.error('Error completando primera vez', e);
    }
  },

  guardarTiempo: async (elapsedSeconds) => {
    const { token, usuario } = get();
    if (!token || !usuario) return;
    try {
      await axios.post(`${API_URL}/auth/save-time`, {
        elapsed_seconds: elapsedSeconds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const nuevoUsuario = { ...usuario, elapsed_seconds: elapsedSeconds };
      set({ usuario: nuevoUsuario });
      localStorage.setItem('usuario', JSON.stringify(nuevoUsuario));
    } catch (e) {
      console.error('Error guardando tiempo transcurrido:', e);
    }
  },

  restaurarSesion: () => {
    const token = localStorage.getItem('token');
    const usuarioStr = localStorage.getItem('usuario');

    if (token && usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        set({
          token,
          usuario,
          isAuthenticated: true,
        });
      } catch (e) {
        console.error('Error restaurando sesión', e);
      }
    }
  },
}));

export default useAuthStore;
