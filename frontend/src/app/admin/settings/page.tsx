'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminSettings() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || user?.role !== 'admin') return router.push('/login');

    fetch('http://localhost:4000/api/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { 
          setSettings(Array.isArray(data) ? data : []); 
          setLoading(false); 
      })
      .catch(() => { setSettings([]); setLoading(false); });
  }, [user, token, router]);

  const updateSetting = async (key: string, value: string) => {
      try {
          const res = await fetch(`http://localhost:4000/api/settings/${key}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ value })
          });
          if (res.ok) alert('Zapisano pomyślnie!');
      } catch (err) { alert('Błąd przy zapisywaniu.'); }
  };

  if (loading) return <div className="min-h-screen text-muted flex items-center justify-center">Rozruch systemu...</div>;

  return (
    <div className="min-h-screen flex">
      {/* Pasek Boczny */}
      <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-3xl flex flex-col p-6 fixed inset-y-0 z-10 w-fit lg:w-64 hidden lg:flex">
        <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">A</div>
            <h2 className="text-lg font-bold tracking-tight">AdminPanel</h2>
        </div>
        <nav className="flex-1 space-y-1">
          <Link href="/admin" className="flex items-center px-4 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg transition-all font-medium">Wszystkie Zadania</Link>
          <Link href="/admin/classes" className="flex items-center px-4 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg transition-all font-medium">Klasy i Uczniowie</Link>
          <Link href="/admin/settings" className="flex items-center px-4 py-2.5 bg-white/5 text-white rounded-lg font-medium border border-white/10">Ustawienia Systemu</Link>
        </nav>
        <button onClick={() => { useAuthStore.getState().logout(); router.push('/login'); }} className="mt-auto px-4 py-2 text-left text-zinc-500 hover:text-red-400 transition-colors font-medium text-sm">Wyloguj się</button>
      </aside>

      {/* Kontent */}
      <main className="flex-1 lg:pl-64 p-8 xl:p-12 overflow-y-auto w-full">
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="mb-8">
                <h1 className="heading-primary mb-1">Ustawienia Globalne</h1>
                <p className="text-muted text-sm border-b border-white/5 pb-6">Preferencje platformy wpływające na walidację i zabezpieczenia w modułach.</p>
            </header>

            <div className="space-y-4">
                {settings.map((s) => (
                    <div key={s.id} className="glass-panel p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg text-white mb-1">{s.key}</h3>
                            <p className="text-xs text-zinc-400 max-w-sm">{s.description}</p>
                        </div>
                        <div className="flex-1 w-full md:w-auto flex flex-col sm:flex-row gap-3">
                            <input 
                                type="text" 
                                defaultValue={s.value}
                                onChange={(e) => {
                                    const copy = [...settings];
                                    const idx = copy.findIndex(i => i.id === s.id);
                                    copy[idx].value = e.target.value;
                                    setSettings(copy);
                                }}
                                className="input-field w-full font-mono text-sm"
                            />
                            <button onClick={() => updateSetting(s.key, s.value)} className="btn-secondary !bg-blue-600/10 !text-blue-400 !border-blue-500/20 hover:!bg-blue-600/20 whitespace-nowrap">
                                Zastosuj
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </main>
    </div>
  );
}
