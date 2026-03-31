'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { io } from 'socket.io-client';
import { apiFetch } from '@/lib/api';

export default function AdminDashboard() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState({ activeStudents: 0, tasksCount: 0, ungradedSubmissions: 0 });

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      router.push('/login');
      return;
    }

    // Pobieranie zadań
    apiFetch('/tasks')
      .then(res => res.json())
      .then(data => setTasks(Array.isArray(data) ? data : []))
      .catch(console.error);

    // Pobieranie statystyk
    apiFetch('/tasks/stats/dashboard')
      .then(res => res.json())
      .then(data => {
          if(data && typeof data === 'object' && !data.error) setStats(data);
      })
      .catch(console.error);

    const socket = io('http://localhost:4000');
    socket.emit('joinRoom', `admin_${user?.id}`);
    socket.on('newSubmission', () => {
        // Odśwież statystyki przy nowym zgłoszeniu
        apiFetch('/tasks/stats/dashboard')
            .then(res => res.json())
            .then(data => { if(!data.error) setStats(data); });
    });

    return () => { socket.disconnect(); };
  }, [user, token, router]);

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć to zadanie?')) return;
    try {
        const res = await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
        if (res.ok) {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setStats(prev => ({ ...prev, tasksCount: prev.tasksCount - 1}));
        }
    } catch(err) { alert('Błąd'); }
  };

  return (
    <div className="min-h-screen flex bg-[#050505]">
      {/* Pasek Boczny (Sidebar) */}
      <aside className="w-64 border-r border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col p-6 fixed inset-y-0 z-10 hidden lg:flex">
        <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">A</div>
            <h2 className="text-lg font-bold tracking-tight text-white">AdminPanel</h2>
        </div>
        
        <nav className="flex-1 space-y-1">
          <Link href="/admin" className="flex items-center px-4 py-2.5 bg-white/5 text-white rounded-lg font-medium border border-white/10">Wszystkie Zadania</Link>
          <Link href="/admin/classes" className="flex items-center px-4 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg transition-all font-medium">Klasy i Uczniowie</Link>
          <Link href="/admin/settings" className="flex items-center px-4 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg transition-all font-medium">Ustawienia Systemu</Link>
        </nav>
        
        <button onClick={() => { useAuthStore.getState().logout(); router.push('/login'); }} className="mt-auto px-4 py-2 text-left text-zinc-500 hover:text-red-400 transition-colors font-medium text-sm">
          Wyloguj się
        </button>
      </aside>

      {/* Główna zawartość */}
      <main className="flex-1 lg:pl-64 p-8 xl:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
            
            <header className="flex items-center justify-between border-b border-white/5 pb-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-1">Przegląd Systemu</h1>
                <p className="text-zinc-500 text-sm">Monitoruj aktywność i zarządzaj zleceniami.</p>
            </div>
            <button onClick={() => router.push('/admin/tasks/new')} className="btn-primary !px-6 !py-3 font-bold">
                + Nowe zadanie
            </button>
            </header>

            {/* Statystyki Kafelki */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 border-zinc-800">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Aktywni Uczniowie</p>
                    <p className="text-4xl font-bold text-blue-400">{stats.activeStudents}</p>
                </div>
                <div className="glass-panel p-6 border-zinc-800">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Stworzone Zadania</p>
                    <p className="text-4xl font-bold text-white">{stats.tasksCount}</p>
                </div>
                <div className="glass-panel p-6 border-zinc-800">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2 flex items-center gap-2">Do sprawdzenia {stats.ungradedSubmissions > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}</p>
                    <p className="text-4xl font-bold text-white">{stats.ungradedSubmissions}</p>
                </div>
            </div>

            {/* Tabela */}
            <div className="glass-panel overflow-hidden border-zinc-800">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/5 bg-white/[0.01]">
                    <tr>
                        <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">ID</th>
                        <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Tytuł Zadania</th>
                        <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Termin Oddania</th>
                        <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-widest text-[10px] text-right">Zarządzaj</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                    {tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4 text-zinc-500 font-mono">#{task.id}</td>
                        <td className="px-6 py-4 font-bold text-white group-hover:text-blue-400 transition-colors">{task.title}</td>
                        <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{new Date(task.deadline).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => router.push(`/admin/tasks/${task.id}`)} className="px-3 py-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-all font-bold text-xs uppercase tracking-tighter">Oceny</button>
                            <button onClick={() => router.push(`/admin/tasks/${task.id}/edit`)} className="px-3 py-1.5 text-zinc-400 hover:bg-white/5 rounded-md transition-all font-bold text-xs uppercase tracking-tighter">Edytuj</button>
                            <button onClick={() => handleDeleteTask(task.id)} className="px-3 py-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-all font-bold text-xs uppercase tracking-tighter">Usuń</button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                {tasks.length === 0 && (
                    <div className="p-12 text-center text-zinc-600 italic">
                    Brak zadań w systemie. Rozpocznij od dodania pierwszego zadania.
                    </div>
                )}
            </div>

        </div>
      </main>
    </div>
  );
}
