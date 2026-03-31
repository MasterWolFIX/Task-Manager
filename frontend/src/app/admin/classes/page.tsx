'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function AdminClasses() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formularze
  const [newClassName, setNewClassName] = useState('');
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  
  // Single
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [targetClassId, setTargetClassId] = useState('');

  // Bulk
  const [bulkData, setBulkData] = useState('');

  const fetchData = async () => {
    try {
      const classRes = await apiFetch('/classes');
      const clsData = await classRes.json();
      setClasses(Array.isArray(clsData) ? clsData : []);
      
      const userRes = await apiFetch('/classes/users');
      const usrData = await userRes.json();
      setUsers(Array.isArray(usrData) ? usrData.filter((u: any) => u.role !== 'admin') : []);
    } catch (err) {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (!token || user?.role !== 'admin') return router.push('/login');
    fetchData();
  }, [user, token, router]);

  const handleCreateClass = async (e: any) => {
    e.preventDefault();
    await apiFetch('/classes', { method: 'POST', body: JSON.stringify({ name: newClassName }) });
    setNewClassName(''); fetchData();
  };

  const handleCreateSingle = async (e: any) => {
    e.preventDefault();
    const res = await apiFetch('/classes/users', { 
        method: 'POST', 
        body: JSON.stringify({ name: newStudentName, email: newStudentEmail }) 
    });
    if (!res.ok) return alert('Błąd (konto może już istnieć)');
    const nu = await res.json();
    if (targetClassId) {
        await apiFetch(`/classes/${targetClassId}/assign`, { 
            method: 'POST', 
            body: JSON.stringify({ userId: nu.id }) 
        });
    }
    setNewStudentName(''); setNewStudentEmail(''); fetchData();
  };

  const handleBulkAdd = async () => {
      const lines = bulkData.split('\n').filter(l => l.trim().length > 5);
      let count = 0;
      for (const line of lines) {
          const parts = line.split(';').map(p => p.trim());
          if (parts.length < 2) continue;
          const res = await apiFetch('/classes/users', { 
              method: 'POST', 
              body: JSON.stringify({ name: parts[0], email: parts[1] }) 
          });
          if (res.ok) {
              const nu = await res.json();
              if (targetClassId) {
                  await apiFetch(`/classes/${targetClassId}/assign`, { 
                      method: 'POST', 
                      body: JSON.stringify({ userId: nu.id }) 
                  });
              }
              count++;
          }
      }
      alert(`Zakończono. Dodano ${count} uczniów.`);
      setBulkData(''); fetchData();
  };

  const removeStudentFromClass = async (classId: number, userId: number) => {
      if(!confirm('Usunąć ucznia z tej klasy?')) return;
      await apiFetch(`/classes/${classId}/assign/${userId}`, { method: 'DELETE' });
      fetchData();
  };

  if (loading) return <div className="min-h-screen text-muted flex items-center justify-center bg-black">Autoryzacja dostępu...</div>;

  return (
    <div className="min-h-screen flex bg-[#050505]">
      <aside className="w-64 border-r border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col p-6 fixed inset-y-0 z-10 hidden lg:flex">
        <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] text-sm">A</div>
            <h2 className="text-lg font-bold tracking-tight text-white uppercase tracking-widest text-[13px]">AdminPanel</h2>
        </div>
        <nav className="flex-1 space-y-1">
          <Link href="/admin" className="flex items-center px-4 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg transition-all font-medium text-sm">Wszystkie Zadania</Link>
          <Link href="/admin/classes" className="flex items-center px-4 py-2.5 bg-white/5 text-white rounded-lg font-medium border border-white/10 text-sm">Klasy i Uczniowie</Link>
          <Link href="/admin/settings" className="flex items-center px-4 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg transition-all font-medium text-sm">Ustawienia Systemu</Link>
        </nav>
      </aside>

      <main className="flex-1 lg:pl-64 p-8 xl:p-12 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto space-y-8 text-white">
            <header className="mb-0 border-b border-white/5 pb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Zasoby Ludzkie</h1>
                <p className="text-zinc-500 text-sm">Zarządzaj strukturą grup i prowadź ewidencję uczestników kursu.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                
                <div className="space-y-6">
                    <div className="glass-panel p-6 border-zinc-800">
                        <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-500 mb-4 flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Otwórz nową klasę
                        </h3>
                        <form onSubmit={handleCreateClass} className="flex gap-2">
                            <input required placeholder="Nazwa klasy..." value={newClassName} onChange={e => setNewClassName(e.target.value)} className="input-field !py-3 !bg-black flex-1 text-sm font-bold" />
                            <button type="submit" className="btn-primary !py-2.5 px-8 !bg-zinc-100 !text-black hover:!bg-white font-bold text-xs uppercase tracking-widest">Utwórz</button>
                        </form>
                    </div>

                    <div className="glass-panel p-6 border-zinc-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-pink-500 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span> Rekrutacja
                            </h3>
                            <div className="flex bg-black p-1 rounded-lg border border-white/5">
                                <button onClick={() => setAddMode('single')} className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${addMode === 'single' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>SINGLE</button>
                                <button onClick={() => setAddMode('bulk')} className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${addMode === 'bulk' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>BULK</button>
                            </div>
                        </div>

                        {addMode === 'single' ? (
                            <form onSubmit={handleCreateSingle} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <input required placeholder="Imię i Nazwisko" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="input-field !py-3 text-sm" />
                                    <input required type="email" placeholder="E-mail ucznia" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} className="input-field !py-3 text-sm" />
                                </div>
                                <div className="flex gap-2">
                                    <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="input-field !py-3 !bg-black flex-1 appearance-none cursor-pointer text-xs font-bold text-zinc-400">
                                        <option value="">Wybierz grupę docelową (opcjonalnie)</option>
                                        {classes.map(c => <option key={c.id} value={c.id} className="bg-zinc-900">{c.name}</option>)}
                                    </select>
                                    <button type="submit" className="btn-primary !py-3 px-8 !bg-pink-600 hover:!bg-pink-500 shadow-pink-500/20 border-none font-bold text-xs uppercase tracking-widest">Załóż</button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <textarea 
                                    rows={6} 
                                    value={bulkData} 
                                    onChange={e => setBulkData(e.target.value)}
                                    placeholder="Jan Kowalski; jan@szkola.pl&#10;Anna Nowak; anna@szkola.pl"
                                    className="input-field !py-3 font-mono text-xs !bg-black tracking-tighter"
                                />
                                <div className="flex gap-2">
                                    <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="input-field !py-3 flex-1 appearance-none cursor-pointer text-xs font-bold text-zinc-400 !bg-black">
                                        <option value="">Automatycznie przypisz do grupy...</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <button onClick={handleBulkAdd} className="btn-primary !py-3 px-10 !bg-white !text-black hover:!bg-zinc-200 border-none uppercase font-black text-[10px] tracking-widest">Import</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="glass-panel p-6 border-zinc-800">
                        <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-blue-400 mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Transferuj Studenta
                        </h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const uId = (document.getElementById('assignUser') as HTMLSelectElement).value;
                            const cId = (document.getElementById('assignClass') as HTMLSelectElement).value;
                            if(!uId || !cId) return;
                            await apiFetch(`/classes/${cId}/assign`, { method: 'POST', body: JSON.stringify({ userId: Number(uId) }) });
                            fetchData();
                        }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <select id="assignUser" required className="input-field !py-3 !bg-black text-xs appearance-none font-bold">
                                <option value="">Kogo wytypować?</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                            </select>
                            <div className="flex gap-2">
                                <select id="assignClass" required className="input-field !py-3 !bg-black text-xs flex-1 appearance-none font-bold">
                                    <option value="">Gdzie przenieść?</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <button type="submit" className="btn-primary !py-3 px-6 !bg-zinc-800 hover:!bg-zinc-700 !text-white border-zinc-700 font-bold text-xs uppercase tracking-widest">OK</button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-[13px] uppercase tracking-[0.3em] font-black text-zinc-600 flex items-center gap-3 justify-center text-center">
                        Stanowiska Klasowe
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                        {classes.map(c => (
                            <div key={c.id} className="glass-panel p-0 flex flex-col border-zinc-800 overflow-hidden min-h-[160px]">
                                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                    <span className="font-black text-white uppercase tracking-widest text-[12px]">{c.name}</span>
                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-black font-mono">{c.classUsers?.length || 0} OSÓB</span>
                                </div>
                                <div className="p-3 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar space-y-1 bg-black/10">
                                    {c.classUsers?.map((cu: any) => (
                                        <div key={cu.user.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/[0.03] transition-all text-sm group">
                                            <div className="min-w-0 pr-4">
                                                <p className="font-bold text-zinc-300 truncate text-[13px] tracking-tight">{cu.user.name}</p>
                                                <p className="text-[9px] text-zinc-600 font-mono truncate uppercase">{cu.user.email}</p>
                                            </div>
                                            <button 
                                                onClick={() => removeStudentFromClass(c.id, cu.user.id)}
                                                className="text-red-500/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-black px-2 py-1 text-xs"
                                            >✕</button>
                                        </div>
                                    ))}
                                    {(!c.classUsers || c.classUsers.length === 0) && (
                                        <div className="h-full flex items-center justify-center p-12 opacity-10 font-mono text-[10px] uppercase tracking-widest">Brak ewidencji</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {classes.length === 0 && (
                            <div className="p-20 text-center glass-panel border-dashed opacity-20 uppercase font-mono tracking-widest text-xs">Lista grup jest pusta</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
      </main>
    </div>
  );
}
