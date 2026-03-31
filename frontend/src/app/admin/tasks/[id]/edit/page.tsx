'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function EditTask() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { token, user, _hasHydrated } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [deadline, setDeadline] = useState('');
  const [submissionType, setSubmissionType] = useState('both');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [classesWithUsers, setClassesWithUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<number[]>([]);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!token || user?.role !== 'admin') { router.push('/login'); return; }
    
    const loadAll = async () => {
        try {
            const [taskRes, classRes] = await Promise.all([
                apiFetch(`/tasks/${id}`),
                apiFetch('/classes')
            ]);
            
            const task = await taskRes.json();
            const classes = await classRes.json();

            setTitle(task.title);
            setDescription(task.description);
            setLanguage(task.language);
            setSubmissionType(task.submissionType || 'both');
            if (task.deadline) {
                const date = new Date(task.deadline);
                setDeadline(date.toISOString().slice(0, 16));
            }
            if (task.assignments) {
                const assignedIds = task.assignments
                    .map((a: any) => a.user?.id)
                    .filter((id: number | undefined) => id !== undefined);
                setSelectedUsers(assignedIds);
            }
            setClassesWithUsers(Array.isArray(classes) ? classes : []);
            setLoading(false);
        } catch (err) { console.error(err); }
    };
    loadAll();
  }, [id, token, user, router, _hasHydrated]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/tasks/${id}`, { 
          method: 'PUT', 
          body: JSON.stringify({ 
              title, 
              description, 
              language, 
              deadline, 
              submissionType,
              assignedUserIds: selectedUsers 
          }) 
      });
      if (!res.ok) throw new Error('Błąd przy aktualizacji.');
      router.push('/admin');
    } catch (err: any) { setMessage(err.message); }
  };

  const handleLogout = () => {
    useAuthStore.getState().logout();
    router.push('/login');
  };

  if (!_hasHydrated) return null;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black font-black uppercase tracking-[1em] text-zinc-900 animate-pulse">Syncing ID #{id}...</div>;

  return (
    <div className="min-h-screen flex h-screen overflow-hidden bg-[#050505] text-[#e4e4e7] selection:bg-blue-600/30">
      
      {/* SHARED SIDEBAR */}
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
          </nav>
      </aside>

      {/* MAIN HUB */}
      <section className="flex-1 flex flex-col overflow-hidden relative">
          <header className="h-28 border-b border-white/5 flex items-center justify-between px-12 bg-black/20">
              <div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-zinc-700 ml-1 mb-1">Configuration Matrix</h2>
                  <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Edycja Zlecenia</h1>
              </div>
              <div className="flex items-center gap-6">
                  <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-[0.4em] text-red-600 hover:text-white hover:bg-red-600 transition-all border-2 border-red-600/30 px-8 py-3 rounded-2xl shadow-xl">
                      WYLOGUJ
                  </button>
                  <Link href="/admin" className="text-zinc-600 hover:text-white text-[10px] font-black uppercase tracking-[0.4em] border border-white/5 px-6 py-3 rounded-2xl">&larr; ANALUJ</Link>
              </div>
          </header>

          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
              <form onSubmit={handleSubmit} className="max-w-6xl mx-auto grid grid-cols-12 gap-12 pt-4 pb-20">
                  
                  <div className="col-span-8 space-y-8">
                      <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[48px] shadow-2xl relative overflow-hidden space-y-10">
                          <div className="grid grid-cols-2 gap-8">
                              <div className="col-span-2">
                                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-3 block">Task Title</label>
                                  <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-white/5 rounded-3xl p-6 text-xl font-black text-white outline-none focus:border-blue-600/40 transition-all" />
                              </div>
                              <div>
                                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-3 block">Technology Stack</label>
                                  <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-3xl p-6 text-[11px] font-black uppercase text-blue-500 outline-none appearance-none">
                                      <option value="javascript">JavaScript / TS</option>
                                      <option value="python">Python 3</option>
                                      <option value="java">Java 17+</option>
                                      <option value="c++">C++</option>
                                      <option value="php">PHP 8</option>
                                      <option value="rust">Rust</option>
                                      <option value="sql">SQL</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-3 block">New Deadline</label>
                                  <input required type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-3xl p-6 text-[11px] font-bold text-white outline-none" />
                              </div>
                          </div>

                          <div>
                              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-800 ml-1 mb-4 block text-center font-black">Metoda Dostarczenia</label>
                              <div className="grid grid-cols-3 gap-4">
                                  {['code', 'zip', 'both'].map((t) => (
                                      <button key={t} type="button" onClick={() => setSubmissionType(t)} className={`p-6 rounded-3xl border transition-all ${submissionType === t ? 'bg-blue-600/10 border-blue-600 text-blue-500' : 'bg-black border-white/5 text-zinc-800'}`}>
                                          <span className="text-[9px] font-black uppercase tracking-widest">{t === 'code' ? '📝 KOD' : t === 'zip' ? '📦 ZIP' : '🔄 DOWOLNE'}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div>
                              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-3 block">Technical Documentation</label>
                              <textarea required rows={10} value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-black border border-white/5 rounded-[40px] p-8 text-[14px] leading-relaxed text-zinc-400 outline-none focus:border-blue-600/40 font-mono" />
                          </div>
                      </div>
                  </div>

                  <div className="col-span-4 space-y-8">
                       <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[48px] shadow-2xl sticky top-8">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-8">Zmień Adresatów</h3>
                          <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 mb-10">
                              {classesWithUsers.map(c => (
                                  <div key={c.id} className="border border-white/5 rounded-3xl bg-black/40 overflow-hidden">
                                      <div className="p-4 flex items-center justify-between" onClick={() => setExpandedClasses(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}>
                                          <span className="text-[10px] font-black uppercase text-zinc-400">{c.name}</span>
                                          <span className="text-zinc-800">{expandedClasses.includes(c.id) ? '▲' : '▼'}</span>
                                      </div>
                                      {expandedClasses.includes(c.id) && (
                                          <div className="p-2 space-y-1">
                                              {c.classUsers?.map((cu: any) => (
                                                  <label key={cu.user.id} className="flex justify-between p-3 rounded-2xl hover:bg-white/[0.03] cursor-pointer">
                                                      <span className="text-[10px] font-bold text-zinc-500">{cu.user.name}</span>
                                                      <input type="checkbox" checked={selectedUsers.includes(cu.user.id)} onChange={() => { setSelectedUsers(prev => prev.includes(cu.user.id) ? prev.filter(id => id !== cu.user.id) : [...prev, cu.user.id]); }} className="w-4 h-4 rounded border-zinc-800 bg-black text-blue-600 focus:ring-0" />
                                                  </label>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[11px] tracking-[0.5em] py-6 rounded-[32px] shadow-2xl transition-all shadow-blue-600/10">
                              ZATWIERDŹ ZMIANY
                          </button>
                      </div>
                  </div>

              </form>
          </div>
      </section>
    </div>
  );
}
