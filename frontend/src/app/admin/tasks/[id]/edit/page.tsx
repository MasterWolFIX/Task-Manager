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
                </nav>
            </aside>

            {/* MAIN HUB */}
            <section className="flex-1 flex flex-col overflow-hidden relative bg-[#050505]">
                <header className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505]/80 backdrop-blur-3xl z-40">
                    <div>
                        <h1 className="text-xl font-black text-white tracking-widest uppercase leading-none italic opacity-80">EDYCJA ZDANIA</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="text-zinc-600 hover:text-white text-[8px] font-black uppercase tracking-widest border border-white/5 px-5 py-1.5 rounded-lg transition-all">&larr; ANULUJ</Link>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto grid grid-cols-12 gap-8 pt-2 pb-20">

                        <div className="col-span-8 space-y-6">
                            <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl shadow-2xl relative overflow-hidden space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-2 block">TYTUŁ</label>
                                        <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-white/5 rounded-xl p-4 text-base font-black text-white outline-none focus:border-blue-600/40 transition-all uppercase" placeholder="..." />
                                    </div>
                                    <div>
                                        <label className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-2 block">TECHNOLOGIA</label>
                                        <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-xl p-4 text-[9px] font-black uppercase text-blue-500 outline-none appearance-none cursor-pointer">
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
                                        <label className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-2 block">DEADLINE</label>
                                        <input required type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-xl p-4 text-[10px] font-bold text-white outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-800 ml-1 mb-3 block text-center font-black">METODA DOSTARCZENIA</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['code', 'zip', 'both'].map((t) => (
                                            <button key={t} type="button" onClick={() => setSubmissionType(t)} className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${submissionType === t ? 'bg-blue-600/10 border-blue-600 text-blue-500 shadow-xl' : 'bg-black border-white/5 text-zinc-800 hover:border-zinc-700'}`}>
                                                <span className="text-xl">{t === 'code' ? '📝' : t === 'zip' ? '📦' : '🔄'}</span>
                                                <span className="text-[7px] font-black uppercase tracking-widest">{t === 'code' ? 'KOD' : t === 'zip' ? 'ARCHIWUM' : 'DOWOLNE'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-800 ml-1 mb-2 block">DOKUMENTACJA</label>
                                    <textarea required rows={10} value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-black border border-white/5 rounded-2xl p-6 text-[11px] leading-relaxed text-zinc-500 outline-none focus:border-blue-600/40 font-mono transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="col-span-4 space-y-6">
                            <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl shadow-2xl sticky top-8">
                                <h3 className="text-[8px] font-black uppercase tracking-[0.4em] text-blue-500 mb-6 px-1">ADRESACI</h3>
                                <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1 mb-6">
                                    {classesWithUsers.map(c => (
                                        <div key={c.id} className="border border-white/5 rounded-2xl bg-black/40 overflow-hidden">
                                            <div className="p-3 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer" onClick={() => setExpandedClasses(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}>
                                                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">{c.name}</span>
                                                <span className="text-zinc-800 text-[8px]">{expandedClasses.includes(c.id) ? '▲' : '▼'}</span>
                                            </div>
                                            {expandedClasses.includes(c.id) && (
                                                <div className="bg-black/60 border-t border-white/5 p-2 space-y-1">
                                                    {c.classUsers?.map((cu: any) => (
                                                        <label key={cu.user.id} className="flex justify-between items-center p-2 rounded-xl hover:bg-white/[0.03] cursor-pointer group">
                                                            <span className="text-[8px] font-bold text-zinc-600 group-hover:text-zinc-400">{cu.user.name}</span>
                                                            <input type="checkbox" checked={selectedUsers.includes(cu.user.id)} onChange={() => { setSelectedUsers(prev => prev.includes(cu.user.id) ? prev.filter(id => id !== cu.user.id) : [...prev, cu.user.id]); }} className="w-3.5 h-3.5 rounded border-zinc-800 bg-black text-blue-600 focus:ring-0" />
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-[0.4em] py-4 rounded-2xl shadow-2xl transition-all shadow-blue-600/10 active:scale-95">
                                    ZATWIERDŹ
                                </button>
                            </div>
                        </div>

                    </form>
                </div>
            </section>
        </div>
    );
}
