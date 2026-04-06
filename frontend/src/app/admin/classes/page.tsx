'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function AdminClasses() {
    const { user, token, _hasHydrated } = useAuthStore();
    const router = useRouter();
    const [classes, setClasses] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Formularze
    const [newClassName, setNewClassName] = useState('');
    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentEmail, setNewStudentEmail] = useState('');
    const [targetClassId, setTargetClassId] = useState('');
    const [bulkData, setBulkData] = useState('');

    // Transfer
    const [transferUserId, setTransferUserId] = useState('');
    const [transferClassId, setTransferClassId] = useState('');

    const fetchData = async () => {
        if (!token) return;
        try {
            const [classRes, userRes] = await Promise.all([
                apiFetch('/classes'),
                apiFetch('/classes/users')
            ]);
            const clsData = await classRes.json();
            const usrData = await userRes.json();
            setClasses(Array.isArray(clsData) ? clsData : []);
            setUsers(Array.isArray(usrData) ? usrData.filter((u: any) => u.role !== 'admin') : []);
        } catch (err) { } finally { setLoading(false); }
    };

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!token || user?.role !== 'admin') { router.push('/login'); return; }
        fetchData();
    }, [user, token, router, _hasHydrated]);

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
        if (!res.ok) return alert('Błąd');
        const nu = await res.json();
        if (targetClassId) {
            await apiFetch(`/classes/${targetClassId}/assign`, { method: 'POST', body: JSON.stringify({ userId: nu.id }) });
        }
        setNewStudentName(''); setNewStudentEmail(''); fetchData();
    };

    const handleTransfer = async (e: any) => {
        e.preventDefault();
        if (!transferUserId || !transferClassId) return;
        try {
            await apiFetch(`/classes/${transferClassId}/assign`, {
                method: 'POST',
                body: JSON.stringify({ userId: Number(transferUserId) })
            });
            setTransferUserId(''); setTransferClassId(''); fetchData();
            alert('Przeniesiono.');
        } catch (err) { alert('Błąd.'); }
    };

    const removeStudentFromClass = async (classId: number, userId: number) => {
        if (!confirm('Czy wykluczyć ucznia?')) return;
        await apiFetch(`/classes/${classId}/assign/${userId}`, { method: 'DELETE' });
        fetchData();
    };

    const handleLogout = () => { useAuthStore.getState().logout(); router.push('/login'); };

    if (!_hasHydrated) return null;

    return (
        <div className="min-h-screen flex h-screen overflow-hidden bg-[#050505] text-[#e4e4e7] text-[9px]">

            <aside className="w-56 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 overflow-hidden">
                <div className="p-5 pb-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm italic uppercase">A</div>
                    <h1 className="text-[11px] font-black uppercase tracking-tighter opacity-40">Console</h1>
                </div>
                <div className="h-px bg-white/5 mb-4"></div>
                <nav className="flex-1 px-3 space-y-1">
                    <Link href="/admin" className="flex items-center px-4 py-2 text-zinc-600 hover:text-white rounded-xl font-black uppercase text-[8px] tracking-widest transition-all">Dashboard</Link>
                    <Link href="/admin/classes" className="flex items-center px-4 py-2 bg-blue-600/10 text-blue-500 rounded-xl font-black uppercase text-[8px] tracking-widest border border-blue-600/20 shadow-lg shadow-blue-900/10">Grupy</Link>
                    <Link href="/admin/settings" className="flex items-center px-4 py-2 text-zinc-600 hover:text-white rounded-xl font-black uppercase text-[8px] tracking-widest transition-all">Settings</Link>
                </nav>
            </aside>

            <section className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505]">
                    <div>
                        <h1 className="text-xl font-black text-white tracking-widest uppercase leading-none italic opacity-80">GROUPS</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/admin/tasks/new')} className="bg-white hover:bg-zinc-200 text-black px-5 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest transition-all">+ NOWE</button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="max-w-screen-xl mx-auto grid grid-cols-12 gap-6 items-start pb-40">

                        {/* LEFT: TOOLS COMPACT */}
                        <div className="col-span-12 lg:col-span-4 space-y-4">
                            <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[24px] shadow-2xl space-y-4">
                                <label className="text-[7px] font-black uppercase tracking-[0.4em] text-blue-500 italic px-1">INICJUJ GRUPĘ</label>
                                <form onSubmit={handleCreateClass} className="flex gap-2">
                                    <input required placeholder="NAZWA..." value={newClassName} onChange={e => setNewClassName(e.target.value)} className="flex-1 bg-black border border-white/5 rounded-xl p-3 text-[9px] font-black text-white uppercase outline-none focus:border-blue-600/40" />
                                    <button type="submit" className="bg-white hover:bg-zinc-200 text-black px-4 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all">STWÓRZ</button>
                                </form>
                            </div>

                            <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[24px] shadow-2xl space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[7px] font-black uppercase tracking-[0.4em] text-emerald-500 italic">REKRUTACJA</label>
                                    <div className="flex bg-black p-0.5 rounded-md border border-white/5 text-[6px] font-black">
                                        <button onClick={() => setAddMode('single')} className={`px-2 py-1 rounded ${addMode === 'single' ? 'bg-zinc-900 text-white' : 'text-zinc-700'}`}>S</button>
                                        <button onClick={() => setAddMode('bulk')} className={`px-2 py-1 rounded ${addMode === 'bulk' ? 'bg-zinc-900 text-white' : 'text-zinc-700'}`}>B</button>
                                    </div>
                                </div>
                                {addMode === 'single' ? (
                                    <form onSubmit={handleCreateSingle} className="space-y-2">
                                        <input required placeholder="Imię i Nazwisko" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="w-full bg-black border border-white/5 rounded-xl p-3 text-[9px] font-black text-white outline-none focus:border-blue-600/40 transition-colors" />
                                        <input required type="email" placeholder="adres@email.pl" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} className="w-full bg-black border border-white/5 rounded-xl p-3 text-[9px] font-black text-white outline-none focus:border-blue-600/40 transition-colors" />
                                        <div className="flex gap-2">
                                            <select value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="flex-1 bg-zinc-950 border border-white/5 rounded-xl p-3 text-[8px] font-black text-zinc-500 outline-none appearance-none cursor-pointer uppercase text-center">
                                                <option value="">DOCELOWA GRUPA</option>
                                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                            <button type="submit" className="bg-emerald-600 text-black px-4 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all shadow-xl">DODAJ</button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-3">
                                        <textarea rows={4} value={bulkData} onChange={e => setBulkData(e.target.value)} placeholder="JAN KOWALSKI; JAN@SZKOLA.PL" className="w-full bg-black border border-white/5 rounded-[20px] p-4 text-[9px] font-mono text-zinc-700 outline-none" />
                                    </div>
                                )}
                            </div>

                            <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[24px] shadow-2xl space-y-4 border-zinc-800/40">
                                <label className="text-[7px] font-black uppercase tracking-[0.4em] text-orange-500 italic px-1">TRANSFER</label>
                                <form onSubmit={handleTransfer} className="space-y-2">
                                    <select required value={transferUserId} onChange={e => setTransferUserId(e.target.value)} className="w-full bg-black border border-white/5 rounded-xl p-3 text-[9px] font-black text-zinc-400 outline-none appearance-none cursor-pointer uppercase">
                                        <option value="">STUDENT...</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                                    </select>
                                    <div className="flex gap-2">
                                        <select required value={transferClassId} onChange={e => setTransferClassId(e.target.value)} className="flex-1 bg-black border border-white/5 rounded-xl p-3 text-[9px] font-black text-zinc-400 outline-none appearance-none cursor-pointer uppercase">
                                            <option value="">DO GRUPY...</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <button type="submit" className="bg-orange-600 text-white px-4 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all">PRZENIEŚ</button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* RIGHT: CLASSES LIST COMPACT */}
                        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            {classes.map(c => (
                                <div key={c.id} className="bg-[#0a0a0a] border border-white/5 rounded-[32px] shadow-2xl flex flex-col group overflow-hidden transition-all hover:bg-white/[0.01]">
                                    <div className="p-5 pb-3 flex justify-between items-center bg-white/[0.02] border-b border-white/5">
                                        <div>
                                            <h3 className="font-black text-white uppercase tracking-[0.2em] text-[12px] leading-tight mb-0.5">{c.name}</h3>
                                            <p className="text-[7px] font-black text-zinc-800 uppercase tracking-widest italic">{c.classUsers?.length || 0} OSÓB</p>
                                        </div>
                                        <span className="w-7 h-7 rounded-lg bg-zinc-950 border border-white/5 flex items-center justify-center font-black text-zinc-900 text-[9px] group-hover:text-blue-500 transition-all uppercase italic">#{c.id}</span>
                                    </div>
                                    <div className="p-4 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar italic font-bold">
                                        {c.classUsers?.map((cu: any) => (
                                            <div key={cu.user.id} className="flex justify-between items-center gap-2 group/item p-3 rounded-2xl hover:bg-white/[0.02] transition-all bg-black/20">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-black text-[9px] text-zinc-300 tracking-tight leading-snug break-words">{cu.user.name}</p>
                                                    <p className="text-[8px] text-zinc-700 font-medium truncate">{cu.user.email}</p>
                                                </div>
                                                <button onClick={() => removeStudentFromClass(c.id, cu.user.id)} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-red-500/10 hover:text-red-500 hover:bg-red-500/10 transition-all font-black text-[10px]">✕</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </section>
        </div>
    );
}
