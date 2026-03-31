'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudentDashboard() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || user?.role !== 'student') {
      router.push('/login');
      return;
    }

    fetch('http://localhost:4000/api/tasks', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
          setTasks(Array.isArray(data) ? data : []);
          setLoading(false);
      })
      .catch(() => { setTasks([]); setLoading(false); });
  }, [user, token, router]);

  if (loading) return <div className="min-h-screen text-muted flex items-center justify-center">Rozruch systemu...</div>;

  return (
    <div className="min-h-screen">
      
      {/* Pasek nawigacji u góry */}
      <nav className="sticky top-0 z-50 glass-panel !rounded-none !border-l-0 !border-r-0 !border-t-0 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                    S
                </div>
                <h1 className="font-semibold tracking-tight text-white">Strefa Ucznia</h1>
            </div>
            
            <div className="flex items-center gap-6 text-sm font-medium text-zinc-400">
                <Link href="/student/settings" className="hover:text-white transition-colors">Ustawienia</Link>
                <div className="w-px h-4 bg-zinc-800"></div>
                <button onClick={() => { useAuthStore.getState().logout(); router.push('/login'); }} className="hover:text-red-400 transition-colors">
                    Wyloguj się
                </button>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 py-12">
        <header className="mb-12">
          <h2 className="text-4xl font-bold tracking-tight text-white mb-2">
            Witaj z powrotem, <span className="text-blue-500">{user?.name}</span>
          </h2>
          <p className="text-zinc-400 text-lg">Poniżej znajdziesz przypisane do Ciebie wyzwania.</p>
        </header>

        {/* Siatka Zadań */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task: any) => (
            <div key={task.id} className="glass-card p-6 flex flex-col group relative overflow-hidden">
              {/* Dekoracyjny blask */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                  <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20 uppercase tracking-wider">
                      {task.language}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono tracking-tighter">
                      #{task.id}
                  </span>
              </div>
              
              <h3 className="mb-2 text-xl font-bold text-white relative z-10">{task.title}</h3>
              <p className="mb-6 text-sm text-zinc-400 flex-1 relative z-10 leading-relaxed">
                  {task.description.length > 120 ? `${task.description.substring(0, 120)}...` : task.description}
              </p>
              
              <div className="flex justify-between items-center mt-auto border-t border-white/5 pt-4 relative z-10">
                <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-1">Termin oddania</span>
                    <span className="text-xs text-zinc-300 font-mono">
                        {new Date(task.deadline).toLocaleDateString()} {new Date(task.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
                <button onClick={() => router.push(`/student/tasks/${task.id}`)} className="text-blue-400 font-medium text-sm hover:text-blue-300 transition-colors group-hover:translate-x-1 duration-300 flex items-center gap-1">
                  Rozpocznij <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {tasks.length === 0 && (
          <div className="glass-panel p-16 flex flex-col items-center justify-center text-center mt-8">
             <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex flex-col items-center justify-center mb-6 border border-zinc-700/50">
                 ✨
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Brak aktywnych wyzwań</h3>
             <p className="text-zinc-400 max-w-sm">
                Super! Wygląda na to, że nie masz aktualnie do zrobienia żadnych zadań koderskich przypisanych przez nauczyciela.
             </p>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-8 py-12 text-center text-xs text-zinc-600 font-medium">
        Moduł Zadań &copy; {new Date().getFullYear()} Wszelkie prawa zastrzeżone.
      </footer>
    </div>
  );
}
