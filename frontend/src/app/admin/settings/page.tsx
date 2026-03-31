'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function AdminSettings() {
  const { user, token, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!token || user?.role !== 'admin') { router.push('/login'); return; }
    apiFetch('/settings')
      .then((res: Response) => res.json())
      .then((data: any) => { 
          setSettings(Array.isArray(data) ? data : []); 
          setLoading(false); 
      })
      .catch(() => { setSettings([]); setLoading(false); });
  }, [user, token, router, _hasHydrated]);

  const updateSetting = async (key: string, value: string) => {
      try {
          const res = await apiFetch(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) });
          if (res.ok) alert('Synced.');
      } catch (err) { alert('Error.'); }
  };

  const handleLogout = () => { useAuthStore.getState().logout(); router.push('/login'); };

  if (!_hasHydrated) return null;

  return (
    <div className="min-h-screen flex h-screen overflow-hidden bg-[#050505] text-[#e4e4e7] text-[9px]">
      
      <aside className="w-56 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 overflow-hidden">
          <div className="p-5 pb-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm italic uppercase shadow-lg shadow-blue-500/20">A</div>
              <h1 className="text-[11px] font-black uppercase tracking-tighter opacity-40 italic">Console</h1>
          </div>
          <div className="h-px bg-white/5 mb-4"></div>
          <nav className="flex-1 px-3 space-y-1">
              <Link href="/admin" className="flex items-center px-4 py-2 text-zinc-600 hover:text-white rounded-xl font-black uppercase text-[8px] tracking-widest transition-all">Dashboard</Link>
              <Link href="/admin/classes" className="flex items-center px-4 py-2 text-zinc-600 hover:text-white rounded-xl font-black uppercase text-[8px] tracking-widest transition-all">Klasy</Link>
              <Link href="/admin/settings" className="flex items-center px-4 py-2 bg-blue-600/10 text-blue-500 rounded-xl font-black uppercase text-[8px] tracking-widest border border-blue-600/20 shadow-lg shadow-blue-900/10 transition-all text-center">Settings</Link>
          </nav>
      </aside>

      <section className="flex-1 flex flex-col overflow-hidden relative">
          <header className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505]">
              <div>
                  <h1 className="text-xl font-black text-white tracking-widest uppercase leading-none italic opacity-80">CONFIG</h1>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleLogout} className="text-[8px] font-black uppercase tracking-widest text-red-600 border border-red-600/20 hover:bg-red-600 hover:text-white px-5 py-1.5 rounded-lg transition-all">LOGOUT</button>
                <button onClick={() => router.push('/admin/tasks/new')} className="bg-white hover:bg-zinc-200 text-black px-5 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest">+ NOWE</button>
              </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="max-w-3xl mx-auto space-y-4 pb-20 pt-4">
                  {loading ? (
                       <div className="p-20 text-center text-[10px] font-black animate-pulse uppercase tracking-[1em] opacity-10">Syncing Parameters...</div>
                  ) : settings.map((s) => (
                      <div key={s.id} className="bg-[#0a0a0a] border border-white/5 p-5 rounded-[24px] flex flex-col space-y-3 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all">
                          <div className="flex justify-between items-start">
                              <div className="flex-1">
                                  <h3 className="font-black text-white uppercase tracking-widest text-[11px] mb-1">{s.key}</h3>
                                  <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest italic opacity-60 leading-relaxed">{s.description}</p>
                              </div>
                              <div className="text-[7px] bg-blue-600/5 text-blue-500 px-2 py-1 rounded-lg border border-blue-600/10 font-black uppercase italic">{s.type}</div>
                          </div>
                          <div className="flex items-center gap-3 relative z-10">
                              <input 
                                  type="text" defaultValue={s.value}
                                  onChange={(e) => {
                                      const copy = [...settings];
                                      const idx = copy.findIndex(i => i.id === s.id);
                                      copy[idx].value = e.target.value;
                                      setSettings(copy);
                                  }}
                                  className="flex-1 bg-black border border-white/5 rounded-xl p-3.5 text-[10px] font-mono text-zinc-500 outline-none focus:border-blue-600/30 font-bold shadow-inner uppercase tracking-widest"
                              />
                              <button onClick={() => updateSetting(s.key, s.value)} className="bg-white hover:bg-zinc-200 text-black px-6 h-11 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all">UPDATE</button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </section>
    </div>
  );
}
