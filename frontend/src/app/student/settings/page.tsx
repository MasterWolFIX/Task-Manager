'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

export default function StudentSettings() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || user?.role !== 'student') {
      router.push('/login');
    }
  }, [token, user, router]);

  const handleChangePassword = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:4000/api/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Błąd przy zmianie hasła');
      
      setMessage('✅ Hasło zaktualizowane pomyślnie!');
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Pasek nawigacji u góry */}
      <nav className="sticky top-0 z-50 glass-panel !rounded-none !border-l-0 !border-r-0 !border-t-0 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                    S
                </div>
                <h1 className="font-semibold tracking-tight text-white">Strefa Ucznia</h1>
            </div>
            <div className="flex items-center gap-6 text-sm font-medium text-zinc-400">
                <Link href="/student" className="hover:text-white transition-colors">&larr; Główna Strona</Link>
                <div className="w-px h-4 bg-zinc-800"></div>
                <button onClick={() => { useAuthStore.getState().logout(); router.push('/login'); }} className="hover:text-red-400 transition-colors">
                    Wyloguj się
                </button>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 py-12 flex-1 w-full flex items-center justify-center">
        <div className="w-full max-w-md">
            
            <header className="mb-8 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Bezpieczeństwo</h2>
              <p className="text-zinc-500 text-sm">Zarządzaj swoimi danymi logowania w systemie.</p>
            </header>

            <div className="glass-panel p-8 shadow-2xl">
              <form onSubmit={handleChangePassword} className="space-y-5">
                
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-2">Obecne hasło</label>
                  <input 
                    type="password" required
                    className="input-field !bg-black/40" 
                    placeholder="Wpisz stary klucz"
                    value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-2">Nowe hasło bezpieczeństwa</label>
                  <input 
                    type="password" required
                    className="input-field !bg-black/40" 
                    placeholder="Wymyśl nowe, silne hasło"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  />
                  <p className="text-[10px] text-zinc-600 font-mono mt-2 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                    <span>Używaj unikalnych haseł, aby chronić wypracowane wyniki.</span>
                  </p>
                </div>

                <div className="pt-2">
                  <button type="submit" className="btn-primary w-full py-3 flex justify-center items-center gap-2">
                    Zatwierdź Zmianę
                  </button>
                </div>

                {message && (
                  <div className={`p-4 rounded border text-sm text-center ${message.includes('✅') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {message}
                  </div>
                )}
              </form>
            </div>

            <p className="text-zinc-600 text-center text-xs mt-8">
              Jeśli podejrzewasz włam na swoje konto, natychmiast zgłoś to nauczycielowi.
            </p>
        </div>
      </main>
    </div>
  );
}
