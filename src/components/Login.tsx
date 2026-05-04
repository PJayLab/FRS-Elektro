import React, { useState } from 'react';
import { Zap, Loader2, Lock, User } from 'lucide-react';

interface LoginProps {
  onLogin: (token: string, username: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Ungültige Anmeldedaten.');
        }
        throw new Error('Anmeldung fehlgeschlagen.');
      }

      const data = await response.json();
      if (data.access_token) {
        onLogin(data.access_token, username);
      } else {
        throw new Error('Token nicht erhalten.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-900/40 mb-6 rotate-3">
            <Zap className="w-10 h-10 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Feuerwehr Elektro</h1>
          <p className="text-slate-500 font-medium tracking-wide">Verbindungslisten-Einsatzportal</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 ml-1">
                Benutzername
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-red-600 transition-all outline-none"
                  placeholder="Benutzername eingeben"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 ml-1">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-red-600 transition-all outline-none"
                  placeholder="Passwort eingeben"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-950/30 border border-red-900/30 rounded-xl text-red-500 text-xs font-bold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-900/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Anmelden'}
            </button>
          </form>
        </div>
        
        <p className="mt-8 text-center text-slate-600 text-xs font-bold leading-relaxed">
          NUR ZUR INTERNEN VERWENDUNG<br/>
          © FRS | BY PATRICK BLUM
        </p>
      </div>
    </div>
  );
};
