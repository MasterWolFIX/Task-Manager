'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { io } from 'socket.io-client';
import { apiFetch } from '@/lib/api';

export default function AdminDashboard() {
    const { user, token, _hasHydrated } = useAuthStore();
    const router = useRouter();
    const [tasks, setTasks] = useState<any[]>([]);
    const [stats, setStats] = useState({ activeStudents: 0, tasksCount: 0, ungradedSubmissions: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const loadData = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const [tasksRes, statsRes] = await Promise.all([apiFetch('/tasks'), apiFetch('/tasks/stats/dashboard')]);
            const tasksData = await tasksRes.json();
            const statsData = await statsRes.json();
            setTasks(Array.isArray(tasksData) ? tasksData : []);
            if (statsData && !statsData.error) setStats(statsData);
        } catch (err) { console.error(err); } finally { setIsLoading(false); }
    };

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!token || user?.role !== 'admin') { router.push('/login'); return; }
        loadData();
        const socket = io('http://localhost:4000');
        socket.on('connect', () => { socket.emit('joinRoom', `admin_${user?.id}`); });
        socket.on('newSubmission', () => loadData());
        return () => { socket.disconnect(); };
    }, [user, token, router, _hasHydrated]);

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm('Usunąć zadanie?')) return;
        try {
            const res = await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
            if (res.ok) {
                setTasks(prev => prev.filter(t => t.id !== taskId));
                setStats(prev => ({ ...prev, tasksCount: prev.tasksCount - 1 }));
            }
        } catch (err) { alert('Błąd'); }
    };

    const handleLogout = () => { useAuthStore.getState().logout(); router.push('/login'); };

    if (!_hasHydrated) return null;

    return (
        <div className="min-h-screen flex h-screen overflow-hidden bg-[#050505] text-[#e4e4e7] text-[10px]">

            {/* MOBILE OVERLAY */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside className={`
        fixed lg:relative z-40
        w-56 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 h-full
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <div className="p-5 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white shadow-lg text-sm italic uppercase">A</div>
                        <h1 className="text-[11px] font-black uppercase tracking-tighter opacity-40">Console</h1>
                    </div>
                </div>
                <div className="h-px bg-white/5 mb-4"></div>
                <nav className="flex-1 px-3 space-y-1">
                    <Link href="/admin" onClick={() => setSidebarOpen(false)} className="flex items-center px-4 py-2 bg-blue-600/10 text-blue-500 rounded-xl font-black uppercase text-[8px] tracking-widest border border-blue-600/20 shadow-md">Dashboard</Link>
                    <Link href="/admin/classes" onClick={() => setSidebarOpen(false)} className="flex items-center px-4 py-2 text-zinc-600 hover:text-white rounded-xl transition-all font-black uppercase text-[8px] tracking-widest">Klasy</Link>
                    <Link href="/admin/settings" onClick={() => setSidebarOpen(false)} className="flex items-center px-4 py-2 text-zinc-600 hover:text-white rounded-xl transition-all font-black uppercase text-[8px] tracking-widest">Ustawienia</Link>
                </nav>

                {/* LOGOUT — widoczny tylko w sidebarze na stronie głównej admina */}
                <div className="p-3 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="w-full text-[8px] font-black uppercase tracking-widest text-red-600 border border-red-600/20 hover:bg-red-600 hover:text-white px-3 py-2 rounded-lg transition-all"
                    >
                        LOGOUT
                    </button>
                </div>
            </aside>

            <section className="flex-1 flex flex-col overflow-hidden bg-[#050505] min-w-0">
                <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 sm:px-8 bg-[#050505]/80 backdrop-blur-3xl z-20 shrink-0">
                    <div className="flex items-center gap-3">
                        {/* HAMBURGER — mobile */}
                        <button
                            onClick={() => setSidebarOpen(prev => !prev)}
                            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-zinc-500 hover:text-white hover:border-white/30 transition-all"
                            aria-label="Otwórz menu"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h2 className="text-xl font-black text-white tracking-widest uppercase leading-none italic opacity-80">ZADANIA</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/admin/tasks/new')} className="bg-white hover:bg-zinc-200 text-black px-4 sm:px-5 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest">+ NOWE</button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-4 sm:space-y-6">
                    {/* STATS */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {[
                            { label: 'Użytkownicy', value: stats.activeStudents },
                            { label: 'Zadania', value: stats.tasksCount },
                            { label: 'Do Review', value: stats.ungradedSubmissions, alert: stats.ungradedSubmissions > 0 }
                        ].map((s, i) => (
                            <div key={i} className="bg-[#0a0a0a] border border-white/5 p-3 sm:p-4 rounded-2xl relative group overflow-hidden">
                                <p className="text-[7px] font-black uppercase tracking-widest text-zinc-800 mb-2 group-hover:text-white transition-colors truncate">{s.label}</p>
                                <p className="text-xl sm:text-2xl font-black text-white tracking-tighter leading-none">{s.value}</p>
                                {s.alert && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]"></div>}
                            </div>
                        ))}
                    </div>

                    {/* TASKS LIST */}
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-[24px] overflow-hidden p-1.5 shadow-2xl">
                        {isLoading ? (
                            <div className="p-20 text-center opacity-10 font-black uppercase text-[10px] animate-pulse">Ładowanie...</div>
                        ) : tasks.length > 0 ? (
                            <div className="divide-y divide-white/5">
                                {tasks.map((task) => (
                                    <div key={task.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 px-4 sm:px-6 hover:bg-white/[0.01] transition-all group gap-3">
                                        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-white/5 flex items-center justify-center font-mono text-[8px] text-zinc-800 font-bold group-hover:bg-blue-600 group-hover:text-white transition-all italic shrink-0">
                                                #{task.id}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                    <h3 className="text-[12px] font-bold text-white tracking-tight group-hover:text-blue-500 transition-colors uppercase leading-none truncate">{task.title}</h3>
                                                    <span className="text-[6px] font-black uppercase px-1.5 py-0.5 bg-zinc-900 text-zinc-700 rounded border border-white/5 shrink-0">{task.language}</span>
                                                    {task.submissions && task.submissions.length > 0 && (
                                                        <div className="flex items-center gap-1.5 opacity-70">
                                                            <span className="text-[10px] grayscale brightness-125" title="Paczek do sprawdzenia">📦</span>
                                                            <span className="text-[10px] font-black">
                                                                {task.submissions.filter((s: any) => s.type === 'zip' && (!s.status || s.status === 'pending')).length}
                                                            </span>
                                                            <span className="text-[10px] grayscale brightness-125 ml-1" title="Kodów do sprawdzenia">📄</span>
                                                            <span className="text-[10px] font-black">
                                                                {task.submissions.filter((s: any) => s.type === 'code' && (!s.status || s.status === 'pending')).length}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[8px] font-medium text-zinc-800 uppercase tracking-widest italic">{new Date(task.deadline).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 pl-12 sm:pl-0">
                                            <button onClick={() => router.push(`/admin/tasks/${task.id}`)} className="h-7 px-3 sm:px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all font-black uppercase text-[8px] tracking-widest shadow-lg shadow-blue-900/10">PANEL OCEN</button>
                                            <button onClick={() => router.push(`/admin/tasks/${task.id}/edit`)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900 border border-white/5 hover:border-white/20 text-zinc-700 hover:text-white transition-all"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                            <button onClick={() => handleDeleteTask(task.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-600/5 hover:bg-red-600 hover:text-white text-red-600 border border-red-600/10 transition-all"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center text-zinc-900 font-black uppercase text-[9px] tracking-widest opacity-20 italic">Brak zadań.</div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
