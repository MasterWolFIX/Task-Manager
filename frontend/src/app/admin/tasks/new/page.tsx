'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

export default function NewTask() {
  const router = useRouter();
  const { token, user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [deadline, setDeadline] = useState('');
  const [message, setMessage] = useState('');
  
  const [classesWithUsers, setClassesWithUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<number[]>([]);

  useEffect(() => {
    if (!token || user?.role !== 'admin') { router.push('/login'); return; }
    
    // Pobierz klasy wraz z użytkownikami
    fetch('http://localhost:4000/api/classes', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setClassesWithUsers(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [token, user, router]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:4000/api/tasks', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
          body: JSON.stringify({ 
              title, 
              description, 
              language, 
              deadline, 
              assignedUserIds: selectedUsers 
          }) 
      });
      if (!res.ok) throw new Error('Błąd przy publikacji.');
      router.push('/admin');
    } catch (err: any) { setMessage(err.message); }
  };

  const toggleUser = (userId: number) => {
      setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const toggleClass = (classObj: any) => {
      const classUserIds = classObj.classUsers.map((cu: any) => cu.user.id);
      const allSelected = classUserIds.every((id: number) => selectedUsers.includes(id));
      
      if (allSelected) {
          // Odznacz wszystkich z tej klasy
          setSelectedUsers(prev => prev.filter(id => !classUserIds.includes(id)));
      } else {
          // Zaznacz wszystkich z tej klasy (unikając duplikatów)
          setSelectedUsers(prev => {
              const newSet = new Set([...prev, ...classUserIds]);
              return Array.from(newSet);
          });
      }
  };

  const isClassSelected = (classObj: any) => {
      if (!classObj.classUsers || classObj.classUsers.length === 0) return false;
      return classObj.classUsers.every((cu: any) => selectedUsers.includes(cu.user.id));
  };

  const isClassPartial = (classObj: any) => {
      if (!classObj.classUsers || classObj.classUsers.length === 0) return false;
      const selectedCount = classObj.classUsers.filter((cu: any) => selectedUsers.includes(cu.user.id)).length;
      return selectedCount > 0 && selectedCount < classObj.classUsers.length;
  };

  return (
    <div className="min-h-screen flex h-screen overflow-hidden">
      {/* Pasek Boczny */}
      <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-3xl flex flex-col p-6 shrink-0 hidden lg:flex">
        <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">A</div>
            <h2 className="text-lg font-bold tracking-tight">AdminPanel</h2>
        </div>
        <nav className="flex-1 space-y-1">
          <Link href="/admin" className="flex items-center px-4 py-2.5 bg-white/5 text-white rounded-lg font-medium border border-white/10 text-sm transition-all group">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 group-hover:scale-150 transition-transform"></span>
            Wszystkie Zadania
          </Link>
          <Link href="/admin/classes" className="flex items-center px-4 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg transition-all font-medium text-sm">Klasy i Uczniowie</Link>
          <Link href="/admin/settings" className="flex items-center px-4 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg transition-all font-medium text-sm">Ustawienia Systemu</Link>
        </nav>
      </aside>

      {/* Kontent Scrollowalny */}
      <main className="flex-1 overflow-y-auto w-full p-8 xl:p-12 bg-[#050505] custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-8">
            <header className="mb-8 border-b border-white/5 pb-6">
                <Link href="/admin" className="text-zinc-500 hover:text-white text-xs flex items-center gap-2 mb-6 transition-colors font-mono">&larr; POWRÓT DO LISTY</Link>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Tworzenie Wyzwania</h1>
                <p className="text-zinc-500 text-sm">Wypełnij parametry zadania i wybierz adresatów.</p>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Lewa strona: Detale */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="glass-panel p-6 space-y-6 border-zinc-800">
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3">Tytuł zadania</label>
                            <input required value={title} onChange={e => setTitle(e.target.value)} className="input-field !text-lg !font-bold !bg-black/50" placeholder="np. Algorytm Dijkstry" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3">Język docelowy</label>
                                <select value={language} onChange={e => setLanguage(e.target.value)} className="input-field appearance-none cursor-pointer font-bold text-blue-400 !bg-black border-zinc-800 focus:border-blue-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
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
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3">Ostateczny termin</label>
                                <input required type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="input-field font-mono !bg-black/50" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-3">Treść i wymagania</label>
                            <textarea required rows={12} value={description} onChange={e => setDescription(e.target.value)} className="input-field !bg-black/50 font-mono text-sm leading-relaxed" placeholder="Opisz co uczeń musi zakodować..." />
                        </div>
                    </div>
                </div>

                {/* Prawa strona: Przypisania (EXPANDABLE UI) */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 border-zinc-800 sticky top-0">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs uppercase tracking-widest font-bold text-blue-400">Adresaci</h3>
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full border border-blue-500/20 font-bold">
                                {selectedUsers.length} Wybranych
                            </span>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            {classesWithUsers.map(c => {
                                const isExp = expandedClasses.includes(c.id);
                                const isFull = isClassSelected(c);
                                const isPart = isClassPartial(c);

                                return (
                                    <div key={c.id} className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
                                        <div className={`p-3 flex items-center justify-between transition-colors ${isFull ? 'bg-blue-600/5' : 'hover:bg-white/5'}`}>
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isFull} 
                                                    ref={el => { if (el) el.indeterminate = isPart; }}
                                                    onChange={() => toggleClass(c)} 
                                                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600"
                                                />
                                                <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{c.name}</span>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setExpandedClasses(prev => isExp ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                                                className="text-zinc-500 hover:text-white p-1"
                                            >
                                                {isExp ? '▲' : '▼'}
                                            </button>
                                        </div>

                                        {isExp && (
                                            <div className="bg-black/40 border-t border-white/5 p-2 space-y-1">
                                                {c.classUsers?.map((cu: any) => (
                                                    <label key={cu.user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer group">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-medium text-zinc-400 group-hover:text-white transition-colors">{cu.user.name}</span>
                                                            <span className="text-[9px] text-zinc-600 font-mono italic">{cu.user.email}</span>
                                                        </div>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedUsers.includes(cu.user.id)} 
                                                            onChange={() => toggleUser(cu.user.id)} 
                                                            className="w-3.5 h-3.5 rounded border-zinc-800 bg-zinc-900 text-blue-500"
                                                        />
                                                    </label>
                                                ))}
                                                {(!c.classUsers || c.classUsers.length === 0) && (
                                                    <p className="text-[10px] text-zinc-600 text-center py-2 italic font-mono">Brak członków w klasie</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <button type="submit" className="btn-primary w-full !py-4 font-bold tracking-widest uppercase text-sm shadow-[0_10px_30px_rgba(37,99,235,0.2)]">
                                Opublikuj Zadanie
                            </button>
                            {message && <p className="text-red-400 mt-4 text-center text-xs font-semibold uppercase tracking-tighter">{message}</p>}
                        </div>
                    </div>
                </div>

            </form>
        </div>
      </main>
    </div>
  );
}
