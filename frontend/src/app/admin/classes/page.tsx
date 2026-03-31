'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      const classRes = await fetch('http://localhost:4000/api/classes', { headers: { Authorization: `Bearer ${token}` } });
      const clsData = await classRes.json();
      setClasses(Array.isArray(clsData) ? clsData : []);
      
      const userRes = await fetch('http://localhost:4000/api/classes/users', { headers: { Authorization: `Bearer ${token}` } });
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
    await fetch('http://localhost:4000/api/classes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: newClassName }) });
    setNewClassName(''); fetchData();
  };

  const handleCreateSingle = async (e: any) => {
    e.preventDefault();
    const res = await fetch('http://localhost:4000/api/classes/users', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ name: newStudentName, email: newStudentEmail }) 
    });
    if (!res.ok) return alert('Błąd (konto może już istnieć)');
    const nu = await res.json();
    if (targetClassId) {
        await fetch(`http://localhost:4000/api/classes/${targetClassId}/assign`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
            body: JSON.stringify({ userId: nu.id }) 
        });
    }
    setNewStudentName(''); setNewStudentEmail(''); fetchData();
  };

  const handleBulkAdd = async () => {
      const lines = bulkData.split('\n').filter(l => l.trim().length > 5);
      let count = 0;
      for (const line of lines) {
          // Format: Imię Nazwisko; email@test.pl
          const parts = line.split(';').map(p => p.trim());
          if (parts.length < 2) continue;
          const res = await fetch('http://localhost:4000/api/classes/users', { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
              body: JSON.stringify({ name: parts[0], email: parts[1] }) 
          });
          if (res.ok) {
              const nu = await res.json();
              if (targetClassId) {
                  await fetch(`http://localhost:4000/api/classes/${targetClassId}/assign`, { 
                      method: 'POST', 
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
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
      await fetch(`http://localhost:4000/api/classes/${classId}/assign/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchData();
  };

  if (loading) return <div className="min-h-screen text-muted flex items-center justify-center">Przygotowywanie bazy...</div>;

  return (
    <div className="min-h-screen flex bg-[#050505]">
      <aside className="w-64 border-r border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col p-6 fixed inset-y-0 z-10 hidden lg:flex">
        <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">A</div>
            <h2 className="text-lg font-bold tracking-tight text-white">AdminPanel</h2>
        </div>
        <nav className="flex-1 space-y-1">
          <Link href="/admin" className="flex items-center px-4 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg transition-all font-medium text-sm">Wszystkie Zadania</Link>
          <Link href="/admin/classes" className="flex items-center px-4 py-2.5 bg-white/5 text-white rounded-lg font-medium border border-white/10 text-sm">Klasy i Uczniowie</Link>
          <Link href="/admin/settings" className="flex items-center px-4 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg transition-all font-medium text-sm">Ustawienia Systemu</Link>
        </nav>
      </aside>

      <main className="flex-1 lg:pl-64 p-8 xl:p-12 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto space-y-8 text-white">
            <header className="mb-8 border-b border-white/5 pb-6">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Zarządzanie Uczestnikami</h1>
                <p className="text-zinc-500 text-sm">Strukturyzuj klasy i błyskawicznie importuj uczniów do systemu.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* KOLUMNA LEWA: Tworzenie i Przypisania */}
                <div className="space-y-6">
                    {/* Sekcja 1: Klasy */}
                    <div className="glass-panel p-6 border-zinc-800">
                        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-4">Nowa Grupa Klasowa</h3>
                        <form onSubmit={handleCreateClass} className="flex gap-2">
                            <input required placeholder="Nazwa klasy (np. 3TP Informatyka)" value={newClassName} onChange={e => setNewClassName(e.target.value)} className="input-field !py-2.5 !bg-black/50 flex-1" />
                            <button type="submit" className="btn-primary !py-2.5 px-6 !bg-zinc-100 !text-black hover:!bg-white">Dodaj</button>
                        </form>
                    </div>

                    {/* Sekcja 2: Rekrutacja (Taby) */}
                    <div className="glass-panel p-6 border-zinc-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-pink-500">Rekrutacja Uczniów</h3>
                            <div className="flex bg-black p-1 rounded-lg border border-white/5">
                                <button onClick={() => setAddMode('single')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${addMode === 'single' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>POJEDYNCZO</button>
                                <button onClick={() => setAddMode('bulk')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${addMode === 'bulk' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>MASOWO</button>
                            </div>
                        </div>

                        {addMode === 'single' ? (
                            <form onSubmit={handleCreateSingle} className="space-y-4">
                                <input required placeholder="Imię i Nazwisko" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="input-field !py-2.5" />
                                <input required type="email" placeholder="E-mail" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} className="input-field !py-2.5" />
                                <div className="flex gap-2">
                                    <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="input-field !py-2.5 !bg-black/50 flex-1 appearance-none cursor-pointer">
                                        <option value="">Bez przypisania do klasy</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>Zapisz do: {c.name}</option>)}
                                    </select>
                                    <button type="submit" className="btn-primary !py-2.5 px-6 !bg-pink-600 hover:!bg-pink-500 shadow-pink-500/20 border-none">Utwórz</button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-[10px] text-zinc-500 leading-relaxed bg-black/50 p-3 rounded-lg border border-white/5">
                                    Format: <span className="text-white font-mono">Imię Nazwisko; email@szkola.pl</span> (jedna osoba na linię)
                                </p>
                                <textarea 
                                    rows={5} 
                                    value={bulkData} 
                                    onChange={e => setBulkData(e.target.value)}
                                    placeholder="Jan Kowalski; jan@szkola.pl&#10;Anna Nowak; anna@szkola.pl"
                                    className="input-field !py-3 font-mono text-xs !bg-black"
                                />
                                <div className="flex gap-2">
                                    <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="input-field !py-2 flex-1 appearance-none cursor-pointer">
                                        <option value="">Tylko utwórz profile</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>Wszyscy do: {c.name}</option>)}
                                    </select>
                                    <button onClick={handleBulkAdd} className="btn-primary !py-2 px-8 !bg-blue-600 hover:!bg-blue-500 shadow-blue-500/20 border-none uppercase font-bold text-[10px] tracking-widest">Importuj</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sekcja 3: Przypisanie istniejących */}
                    <div className="glass-panel p-6 border-zinc-800">
                        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-400 mb-4">Transfer / Przypisanie do klasy</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const uId = (document.getElementById('assignUser') as HTMLSelectElement).value;
                            const cId = (document.getElementById('assignClass') as HTMLSelectElement).value;
                            if(!uId || !cId) return;
                            await fetch(`http://localhost:4000/api/classes/${cId}/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId: Number(uId) }) });
                            fetchData();
                        }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <select id="assignUser" required className="input-field !py-2.5 !bg-black text-xs appearance-none">
                                <option value="">Wybierz ucznia...</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                            </select>
                            <div className="flex gap-2">
                                <select id="assignClass" required className="input-field !py-2.5 !bg-black text-xs flex-1 appearance-none">
                                    <option value="">Docelowa klasa...</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <button type="submit" className="btn-primary !py-2 px-4 !bg-zinc-800 hover:!bg-zinc-700 !text-white border-zinc-700">OK</button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* KOLUMNA PRAWA: Wyniki (Karty Klas) */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                        Rejestr klas szkolnych
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {classes.map(c => (
                            <div key={c.id} className="glass-panel p-0 flex flex-col border-zinc-800 overflow-hidden min-h-[250px] group">
                                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                    <span className="font-black text-white uppercase tracking-widest text-[11px] truncate">{c.name}</span>
                                    <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">{c.classUsers?.length || 0}</span>
                                </div>
                                <div className="p-3 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar space-y-1">
                                    {c.classUsers?.map((cu: any) => (
                                        <div key={cu.user.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition-all text-sm group/item">
                                            <div className="min-w-0 pr-2">
                                                <p className="font-semibold text-zinc-300 truncate">{cu.user.name}</p>
                                                <p className="text-[9px] text-zinc-600 font-mono truncate">{cu.user.email}</p>
                                            </div>
                                            <button 
                                                onClick={() => removeStudentFromClass(c.id, cu.user.id)}
                                                className="text-red-500/50 hover:text-red-400 opacity-0 group-item/hover:opacity-100 transition-all font-bold px-2 py-1"
                                            >✕</button>
                                        </div>
                                    ))}
                                    {(!c.classUsers || c.classUsers.length === 0) && (
                                        <div className="h-full flex items-center justify-center p-8 opacity-20 italic text-[10px]">Pusta grupa</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
      </main>
    </div>
  );
}
