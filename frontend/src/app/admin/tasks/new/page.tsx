'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function NewTask() {
  const router = useRouter();
  const { token, user, _hasHydrated } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [deadline, setDeadline] = useState('');
  const [submissionType, setSubmissionType] = useState('both');
  const [message, setMessage] = useState('');
  
  const [classesWithUsers, setClassesWithUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<number[]>([]);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!token || user?.role !== 'admin') { router.push('/login'); return; }
    
    apiFetch('/classes')
      .then(res => res.json())
      .then(data => setClassesWithUsers(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [token, user, router, _hasHydrated]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!selectedUsers.length) { setMessage('Wybierz przynajmniej jednego adresata!'); return; }
    try {
      const res = await apiFetch('/tasks', { 
          method: 'POST', 
          body: JSON.stringify({ 
              title, 
              description, 
              language, 
              deadline, 
              submissionType,
              assignedUserIds: selectedUsers 
          }) 
      });
      if (!res.ok) throw new Error('Błąd przy publikacji.');
      router.push('/admin');
    } catch (err: any) { setMessage(err.message); }
  };

  const handleLogout = () => {
    useAuthStore.getState().logout();
    router.push('/login');
  };

  if (!_hasHydrated) return null;

  return (
    <div className="min-h-screen flex h-screen overflow-hidden bg-[#050505] text-[#e4e4e7] selection:bg-blue-600/30">
      
      {/* SIDEBAR (SHARED DESIGN) */}
      <aside className="w-80 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 overflow-hidden">
          <div className="p-10 pb-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white shadow-xl shadow-blue-500/20 text-xl italic uppercase">A</div>
                <div>
                    <h1 className="text-[15px] font-black tracking-tighter uppercase leading-tight">Admin</h1>
                    <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-[0.2em]">{user?.name}</p>
                </div>
              </div>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent mb-8"></div>
          <nav className="flex-1 px-4 space-y-2">
              <Link href="/admin" className="flex items-center px-6 py-4 text-zinc-600 hover:text-white hover:bg-white/[0.03] rounded-3xl transition-all font-black uppercase text-[10px] tracking-[0.3em]">Dashboard</Link>
              <Link href="/admin/classes" className="flex items-center px-6 py-4 text-zinc-600 hover:text-white hover:bg-white/[0.03] rounded-3xl transition-all font-black uppercase text-[10px] tracking-[0.3em]">Klasy</Link>
              <Link href="/admin" className="flex items-center px-6 py-3.5 bg-blue-600/10 text-blue-500 rounded-3xl font-black uppercase text-[10px] tracking-[0.3em] border border-blue-600/20 shadow-xl shadow-blue-900/10">Nowe Zadanie</Link>
          </nav>
      </aside>

      {/* MAIN HUB */}
      <section className="flex-1 flex flex-col overflow-hidden relative">
          <header className="h-28 border-b border-white/5 flex items-center justify-between px-12 bg-[#050505]">
              <div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-zinc-700 ml-1 mb-1">Architectural Panel</h2>
                  <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Tworzenie Zlecenia</h1>
              </div>
              <div className="flex items-center gap-6">
                  <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-[0.4em] text-red-600 hover:text-white hover:bg-red-600 transition-all border-2 border-red-600/30 px-8 py-3 rounded-2xl">
                      WYLOGUJ
                  </button>
                  <Link href="/admin" className="text-zinc-600 hover:text-white text-[10px] font-black uppercase tracking-[0.4em] transition-colors border border-white/5 px-6 py-3 rounded-2xl">&larr; ANULUJ</Link>
              </div>
          </header>

          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
              <form onSubmit={handleSubmit} className="max-w-6xl mx-auto grid grid-cols-12 gap-12 pt-4">
                  
                  <div className="col-span-8 space-y-8">
                      <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[48px] shadow-2xl relative overflow-hidden space-y-10">
                          <div className="grid grid-cols-2 gap-8">
                              <div className="col-span-2">
                                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-3 block">Identyfikacja Projektu</label>
                                  <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-white/5 rounded-3xl p-6 text-xl font-black text-white outline-none focus:border-blue-600/40 transition-all placeholder:text-zinc-900" placeholder="np. Algorytm Kompresji..." />
                              </div>
                              <div>
                                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-3 block">Środowisko Językowe</label>
                                  <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-3xl p-6 text-[11px] font-black uppercase text-blue-500 outline-none appearance-none cursor-pointer">
                                      <option value="javascript">JavaScript / TS</option>
                                      <option value="python">Python 3</option>
                                      <option value="java">Java 17+</option>
                                      <option value="c++">C++ (GCC)</option>
                                      <option value="php">PHP 8</option>
                                      <option value="rust">Rust</option>
                                      <option value="sql">SQL</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-3 block">Termin Wygaśnięcia</label>
                                  <input required type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-3xl p-6 text-[11px] font-bold text-white outline-none" />
                              </div>
                          </div>

                          <div>
                              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-4 block text-center">Wymagana technika oddania</label>
                              <div className="grid grid-cols-3 gap-6">
                                  {[
                                      { id: 'code', label: 'Tylko Kod', icon: '📝' },
                                      { id: 'zip', label: 'Tylko ZIP', icon: '📦' },
                                      { id: 'both', label: 'Dowolne', icon: '🔄' }
                                  ].map((t) => (
                                      <button key={t.id} type="button" onClick={() => setSubmissionType(t.id)} className={`p-8 rounded-3xl border transition-all flex flex-col items-center justify-center gap-2 ${submissionType === t.id ? 'bg-blue-600/10 border-blue-600 text-blue-500 shadow-xl' : 'bg-black border-white/5 text-zinc-800 hover:border-zinc-700'}`}>
                                          <span className="text-3xl">{t.icon}</span>
                                          <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div>
                              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-3 block">Specyfikacja i Wymagania</label>
                              <textarea required rows={12} value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-black border border-white/5 rounded-[40px] p-8 text-[14px] leading-relaxed text-zinc-400 outline-none focus:border-blue-600/40 transition-all font-medium font-mono" placeholder="Wypisz treść zadania..." />
                          </div>
                      </div>
                  </div>

                  <div className="col-span-4 space-y-8">
                      <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[48px] shadow-2xl sticky top-8">
                          <div className="flex justify-between items-center mb-10">
                              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">Adresaci Zlecenia</h3>
                              <span className="text-[9px] bg-blue-600/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-600/20 font-black">{selectedUsers.length}</span>
                          </div>

                          <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 mb-10">
                              {classesWithUsers.map(c => (
                                  <div key={c.id} className="border border-white/5 rounded-3xl overflow-hidden bg-black/40">
                                      <div className="p-5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer" onClick={() => setExpandedClasses(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}>
                                          <div className="flex items-center gap-4">
                                              <input type="checkbox" checked={c.classUsers?.every((cu: any) => selectedUsers.includes(cu.user.id))} onChange={(e) => { e.stopPropagation(); /* select all classes logic */ }} className="w-4 h-4 rounded-md border-zinc-800 bg-black text-blue-600 focus:ring-0" />
                                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{c.name}</span>
                                          </div>
                                          <span className="text-zinc-800 text-[10px]">{expandedClasses.includes(c.id) ? '▲' : '▼'}</span>
                                      </div>
                                      {expandedClasses.includes(c.id) && (
                                          <div className="bg-black/60 border-t border-white/5 p-4 space-y-1">
                                              {c.classUsers?.map((cu: any) => (
                                                  <label key={cu.user.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.03] cursor-pointer group" onClick={(e) => e.stopPropagation()}>
                                                      <span className="text-[10px] font-bold text-zinc-500 group-hover:text-zinc-200">{cu.user.name}</span>
                                                      <input type="checkbox" checked={selectedUsers.includes(cu.user.id)} onChange={() => { setSelectedUsers(prev => prev.includes(cu.user.id) ? prev.filter(id => id !== cu.user.id) : [...prev, cu.user.id]); }} className="w-4 h-4 rounded-md border-zinc-800 bg-black text-blue-500 focus:ring-0" />
                                                  </label>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>

                          <button 
                              type="submit" disabled={selectedUsers.length === 0}
                              className="w-full bg-white hover:bg-zinc-200 text-black font-black uppercase text-[11px] tracking-[0.5em] py-6 rounded-[32px] shadow-2xl transition-all active:scale-95 disabled:opacity-20"
                          >
                              OPUBLIKUJ TERAZ
                          </button>
                      </div>
                  </div>

              </form>
          </div>
      </section>
    </div>
  );
}
