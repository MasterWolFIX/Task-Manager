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
    const [expandedClasses, setExpandedClasses] = useState<(number | string)[]>([]);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!token || user?.role !== 'admin') { router.push('/login'); return; }

        Promise.all([
            apiFetch('/classes').then(res => res.json()),
            apiFetch('/classes/users').then(res => res.json())
        ]).then(([clsData, usrData]) => {
            const classes = Array.isArray(clsData) ? clsData : [];
            const allUsers = Array.isArray(usrData) ? usrData.filter((u: any) => u.role !== 'admin') : [];

            // Zestaw ID uczniów przypisanych do jakiejkolwiek klasy
            const assignedIds = new Set<number>();
            classes.forEach(c => c.classUsers?.forEach((cu: any) => assignedIds.add(cu.user.id)));

            const unassigned = allUsers.filter(u => !assignedIds.has(u.id));
            if (unassigned.length > 0) {
                classes.push({
                    id: 'unassigned',
                    name: 'BEZ KLASY',
                    classUsers: unassigned.map(u => ({ user: u }))
                });
            }
            setClassesWithUsers(classes);
        }).catch(console.error);
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
            <aside className="w-56 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 overflow-hidden">
                <div className="p-5 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white shadow-lg text-sm italic uppercase">A</div>
                        <h1 className="text-[11px] font-black uppercase tracking-tighter opacity-40 italic">Console</h1>
                    </div>
                </div>
                <div className="h-px bg-white/5 mb-4"></div>
                <nav className="flex-1 px-3 space-y-1">
                    <Link href="/admin" className="flex items-center px-4 py-2 text-zinc-600 hover:text-white rounded-xl transition-all font-black uppercase text-[8px] tracking-widest">Dashboard</Link>
                    <Link href="/admin/classes" className="flex items-center px-4 py-2 text-zinc-600 hover:text-white rounded-xl transition-all font-black uppercase text-[8px] tracking-widest">Klasy</Link>
                    <Link href="/admin" className="flex items-center px-4 py-2 bg-blue-600/10 text-blue-500 rounded-xl font-black uppercase text-[8px] tracking-widest border border-blue-600/20 shadow-md">Nowe Zadanie</Link>
                </nav>
            </aside>

            {/* MAIN HUB */}
            <section className="flex-1 flex flex-col overflow-hidden relative bg-[#050505]">
                <header className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505]/80 backdrop-blur-3xl z-40">
                    <div>
                        <h1 className="text-xl font-black text-white tracking-widest uppercase leading-none italic opacity-80">NOWE ZADANIE</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="text-zinc-600 hover:text-white text-[8px] font-black uppercase tracking-widest border border-white/5 px-5 py-1.5 rounded-lg transition-all">&larr; ANULUJ</Link>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto grid grid-cols-12 gap-8 pt-2">

                        <div className="col-span-8 space-y-6">
                            <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl shadow-2xl space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-2 block">TYTUŁ</label>
                                        <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-white/5 rounded-xl p-4 text-base font-black text-white outline-none focus:border-blue-600/40 transition-all placeholder:text-zinc-900" placeholder="Algorytm..." />
                                    </div>
                                    <div>
                                        <label className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-2 block">JĘZYK</label>
                                        <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-xl p-4 text-[9px] font-black uppercase text-blue-500 outline-none appearance-none cursor-pointer">
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
                                        <label className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-2 block">DEADLINE</label>
                                        <input required type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-xl p-4 text-[10px] font-bold text-white outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-3 block text-center">METODA ODDANIA</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'code', label: 'Kod', icon: '📝' },
                                            { id: 'zip', label: 'Archiwum', icon: '📦' },
                                            { id: 'both', label: 'Obydwa', icon: '🔄' }
                                        ].map((t) => (
                                            <button key={t.id} type="button" onClick={() => setSubmissionType(t.id)} className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${submissionType === t.id ? 'bg-blue-600/10 border-blue-600 text-blue-500 shadow-xl' : 'bg-black border-white/5 text-zinc-800 hover:border-zinc-700'}`}>
                                                <span className="text-xl">{t.icon}</span>
                                                <span className="text-[7px] font-black uppercase tracking-widest">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-2 block">SPECYFIKACJA</label>
                                    <textarea required rows={10} value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-black border border-white/5 rounded-2xl p-6 text-[11px] leading-relaxed text-zinc-500 outline-none focus:border-blue-600/40 transition-all font-medium font-mono" placeholder="..." />
                                </div>
                            </div>
                        </div>

                        <div className="col-span-4 space-y-6">
                            <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl shadow-2xl sticky top-8">
                                <div className="flex justify-between items-center mb-6 px-1">
                                    <h3 className="text-[8px] font-black uppercase tracking-[0.4em] text-blue-500">ADRESACI</h3>
                                    <span className="text-[8px] bg-blue-600/10 text-blue-400 px-3 py-1 rounded-lg border border-blue-600/20 font-black">{selectedUsers.length}</span>
                                </div>

                                <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1 mb-6">
                                    {classesWithUsers.map(c => (
                                        <div key={c.id} className="border border-white/5 rounded-2xl overflow-hidden bg-black/40">
                                            <div className="p-3 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer" onClick={() => setExpandedClasses(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={c.classUsers?.length > 0 && c.classUsers?.every((cu: any) => selectedUsers.includes(cu.user.id))}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            const classUserIds = c.classUsers?.map((cu: any) => cu.user.id) || [];
                                                            if (classUserIds.length === 0) return;

                                                            const isAllSelected = classUserIds.every((id: number) => selectedUsers.includes(id));
                                                            if (isAllSelected) {
                                                                setSelectedUsers(prev => prev.filter(id => !classUserIds.includes(id)));
                                                            } else {
                                                                setSelectedUsers(prev => Array.from(new Set([...prev, ...classUserIds])));
                                                            }
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-zinc-800 bg-black text-blue-600 focus:ring-0"
                                                    />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{c.name}</span>
                                                </div>
                                                <span className="text-zinc-800 text-[8px]">{expandedClasses.includes(c.id) ? '▲' : '▼'}</span>
                                            </div>
                                            {expandedClasses.includes(c.id) && (
                                                <div className="bg-black/60 border-t border-white/5 p-2 space-y-1">
                                                    {c.classUsers?.map((cu: any) => (
                                                        <label key={cu.user.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.03] cursor-pointer group" onClick={(e) => e.stopPropagation()}>
                                                            <span className="text-[8px] font-bold text-zinc-600 group-hover:text-zinc-400">{cu.user.name}</span>
                                                            <input type="checkbox" checked={selectedUsers.includes(cu.user.id)} onChange={() => { setSelectedUsers(prev => prev.includes(cu.user.id) ? prev.filter(id => id !== cu.user.id) : [...prev, cu.user.id]); }} className="w-3.5 h-3.5 rounded border-zinc-800 bg-black text-blue-500 focus:ring-0" />
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="submit" disabled={selectedUsers.length === 0}
                                    className="w-full bg-white hover:bg-zinc-200 text-black font-black uppercase text-[10px] tracking-[0.4em] py-4 rounded-2xl shadow-2xl transition-all active:scale-95 disabled:opacity-20"
                                >
                                    OPUBLIKUJ
                                </button>
                            </div>
                        </div>

                    </form>
                </div>
            </section>
        </div>
    );
}
