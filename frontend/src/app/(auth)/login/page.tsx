'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore(state => state.login);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Błąd logowania');

      login(data.accessToken, data.user);
      
      if (data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/student');
      }

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      
      {/* Ozdobne, rozmyte tła */}
      <div className="absolute w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full top-[10%] left-[20%] z-0" pointer-events-none="true" />
      <div className="absolute w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full bottom-[10%] right-[20%] z-0" pointer-events-none="true" />
      
      <div className="glass-panel w-full max-w-sm p-10 z-10 relative">
        <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center mb-4">
                <span className="text-xl font-bold bg-gradient-to-tr from-blue-400 to-cyan-400 bg-clip-text text-transparent">T</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Witamy ponownie</h1>
            <p className="text-sm text-zinc-400 text-center">Wprowadź swoje dane uwierzytelniające, aby zalogować się do platformy edukacyjnej.</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-2">Adres E-mail</label>
            <input 
              type="email" 
              required
              className="input-field" 
              placeholder="imie.nazwisko@edu.pl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-2">Hasło bezpieczeństwa</label>
            <input 
              type="password" 
              required
              className="input-field" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full btn-primary mt-6 !py-3 flex justify-center items-center gap-2 group"
          >
            Zaloguj się do systemu
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </button>
        </form>
        
        {error && (
            <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
            </div>
        )}
      </div>
    </div>
  );
}
