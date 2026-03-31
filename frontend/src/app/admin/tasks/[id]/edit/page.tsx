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
  const { token, user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [deadline, setDeadline] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [classesWithUsers, setClassesWithUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<number[]>([]);

  useEffect(() => {
    if (!token || user?.role !== 'admin') { router.push('/login'); return; }
    
    // Pobierz dane równolegle
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
  }, [id, token, user, router]);

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
              assignedUserIds: selectedUsers 
          }) 
      });
      if (!res.ok) throw new Error('Błąd przy aktualizacji.');
      router.push('/admin');
    } catch (err: any) { setMessage(err.message); }
  };

  const toggleUser = (userId: number) => setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  
  const toggleClass = (classObj: any) => {
      const classUserIds = classObj.classUsers.map((cu: any) => cu.user.id);
      const allSelected = classUserIds.every((id: number) => selectedUsers.includes(id));
      if (allSelected) {
          setSelectedUsers(prev => prev.filter(id => !classUserIds.includes(id)));
      } else {
          setSelectedUsers(prev => Array.from(new Set([...prev, ...classUserIds])));
      }
  };

  const isClassSelected = (classObj: any) => (classObj.classUsers?.length > 0 && classObj.classUsers.every((cu: any) => selectedUsers.includes(cu.user.id)));
  const isClassPartial = (classObj: any) => {
      const cnt = classObj.classUsers?.filter((cu: any) => selectedUsers.includes(cu.user.id)).length || 0;
      return cnt > 0 && cnt < (classObj.classUsers?.length || 0);
  };

  if (loading) return <div className="min-h-screen text-muted flex items-center justify-center bg-black">Autoryzacja dostępu do edytora...</div>;

  return (
    <div className="min-h-screen flex h-screen overflow-hidden bg-[#050505]">
      <aside className="w-64 border-r border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col p-6 shrink-0 hidden lg:flex">
        <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-blue-500/20">A</div>
            <h2 className="text-lg font-bold tracking-tight text-white uppercase text-xs tracking-widest">AdminPanel</h2>
        </div>
        <nav className="flex-1 space-y-1">
          <Link href="/admin" className="flex items-center px-4 py-2.5 bg-white/5 text-white rounded-lg font-medium border border-white/10 text-sm">Wszystkie Zadania</Link>
          <Link href="/admin/classes" className="flex items-center px-4 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg transition-all font-medium text-sm">Klasy i Uczniowie</Link>
          <Link href="/admin/settings" className="flex items-center px-4 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg transition-all font-medium text-sm">Ustawienia Systemu</Link>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto w-full p-8 xl:p-12">
        <div className="max-w-5xl mx-auto space-y-8">
            <header className="mb-8 border-b border-white/5 pb-8">
                <Link href="/admin" className="text-zinc-600 hover:text-white text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-2 mb-6 transition-colors">&larr; ANALUJ EDYCJĘ</Link>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tighter mb-2">Edycja Zlecenia</h1>
                        <p className="text-zinc-500 text-sm">Zaktualizuj wytyczne lub przeadresuj wyzwanie do innych grup.</p>
                    </div>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                
                <div className="xl:col-span-2 space-y-8">
                    <div className="glass-panel p-8 space-y-8 border-zinc-800 bg-black/40">
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.3em] font-black text-zinc-600 mb-4">Tytuł Wyzwania</label>
                            <input required value={title} onChange={e => setTitle(e.target.value)} className="input-field !text-xl !font-black !bg-black border-zinc-800" placeholder="np. API Backendowe..." />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.3em] font-black text-zinc-600 mb-4">Język i Środowisko</label>
                                <select value={language} onChange={e => setLanguage(e.target.value)} className="input-field appearance-none cursor-pointer text-blue-400 font-black !bg-black border-zinc-800 focus:border-blue-500/50 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                                    <option value="javascript">JavaScript / TypeScript</option>
                                    <option value="python">Python 3</option>
                                    <option value="java">Java 17+</option>
                                    <option value="c++">C++ (GCC/Clang)</option>
                                    <option value="php">PHP 8.2</option>
                                    <option value="rust">Rust</option>
                                    <option value="go">Go (Golang)</option>
                                    <option value="sql">SQL / Database</option>
                                    <option value="html">HTML5 / CSS3</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.3em] font-black text-zinc-600 mb-4">Termin oddania</label>
                                <input required type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="input-field font-mono !bg-black border-zinc-800" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.3em] font-black text-zinc-600 mb-4">Dokumentacja Techniczna</label>
                            <textarea required rows={12} value={description} onChange={e => setDescription(e.target.value)} className="input-field font-mono text-sm leading-relaxed !bg-black border-zinc-800" placeholder="Użyj Markdown do opisu zadania..." />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-panel p-6 border-zinc-800 sticky top-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-blue-500">Adresaci</h3>
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 font-black font-mono">
                                {selectedUsers.length} AKTYWNYCH
                            </span>
                        </div>

                        <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                            {classesWithUsers.map(c => {
                                const isExp = expandedClasses.includes(c.id);
                                const isFull = isClassSelected(c);
                                const isPart = isClassPartial(c);

                                return (
                                    <div key={c.id} className="border border-white/5 rounded-2xl overflow-hidden bg-black/20">
                                        <div className={`p-4 flex items-center justify-between transition-all ${isFull ? 'bg-blue-600/5' : 'hover:bg-white/5'}`}>
                                            <div className="flex items-center gap-4">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isFull} 
                                                    ref={el => { if (el) el.indeterminate = isPart; }}
                                                    onChange={() => toggleClass(c)} 
                                                    className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-blue-600 focus:ring-0"
                                                />
                                                <span className="text-[11px] font-black text-zinc-300 uppercase tracking-widest">{c.name}</span>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setExpandedClasses(prev => isExp ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                                                className="text-zinc-600 hover:text-white"
                                            >
                                                {isExp ? '▲' : '▼'}
                                            </button>
                                        </div>

                                        {isExp && (
                                            <div className="bg-black/60 border-t border-white/5 p-3 space-y-1">
                                                {c.classUsers?.map((cu: any) => (
                                                    <label key={cu.user.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer group transition-all">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-zinc-400 group-hover:text-white">{cu.user.name}</span>
                                                            <span className="text-[9px] text-zinc-700 font-mono italic">{cu.user.email}</span>
                                                        </div>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedUsers.includes(cu.user.id)} 
                                                            onChange={() => toggleUser(cu.user.id)} 
                                                            className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-blue-500 focus:ring-0"
                                                        />
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-10 pt-6 border-t border-white/5">
                            <button type="submit" className="btn-primary w-full !py-4 font-black tracking-[0.2em] uppercase text-xs shadow-blue-600/10 border-none transition-all active:scale-95">
                                ZATWIERDŹ ZMIANY
                            </button>
                            {message && <p className="text-red-500 mt-4 text-center text-[10px] font-black uppercase tracking-widest">{message}</p>}
                        </div>
                    </div>
                </div>

            </form>
        </div>
      </main>
    </div>
  );
}
