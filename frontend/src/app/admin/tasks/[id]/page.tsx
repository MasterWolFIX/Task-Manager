'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

export default function AdminTaskDetails() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { token, user } = useAuthStore();
  
  const [task, setTask] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [activeSubmissionId, setActiveSubmissionId] = useState<number | null>(null);
  const [filterClassId, setFilterClassId] = useState<string>('all');
  
  const [gradeInput, setGradeInput] = useState<{ [key: number]: number }>({});
  const [feedbackInput, setFeedbackInput] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (!token || user?.role !== 'admin') return router.push('/login');

    const loadData = async () => {
        try {
            const taskRes = await fetch(`http://localhost:4000/api/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            const taskData = await taskRes.json();
            setTask(taskData);
            
            const clsRes = await fetch('http://localhost:4000/api/classes', { headers: { Authorization: `Bearer ${token}` } });
            const clsData = await clsRes.json();
            setClasses(Array.isArray(clsData) ? clsData : []);

            if (taskData?.submissions?.length > 0) {
                const toReview = taskData.submissions.find((s: any) => !s.grade);
                setActiveSubmissionId(toReview ? toReview.id : taskData.submissions[0].id);
            }
        } catch(err) { console.error(err); }
    };
    loadData();
  }, [id, token, user, router]);

  const handleGrade = async (submissionId: number) => {
    try {
      const res = await fetch(`http://localhost:4000/api/submissions/${submissionId}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ grade: gradeInput[submissionId], feedback: feedbackInput[submissionId] })
      });
      if (res.ok) {
        setTask((prev: any) => ({
          ...prev, submissions: prev.submissions.map((s: any) => s.id === submissionId ? { ...s, grade: gradeInput[submissionId], feedback: feedbackInput[submissionId] } : s)
        }));
      }
    } catch(err) { console.error(err); }
  };

  if (!task) return <div className="min-h-screen flex text-muted items-center justify-center">Odtwarzanie danych...</div>;

  const filteredSubmissions = task.submissions?.filter((s: any) => {
      if (filterClassId === 'all') return true;
      // Sprawdzamy czy którykolwiek wpis classUser ucznia pasuje do filterClassId
      return s.user.classUsers?.some((cu: any) => cu.classId === Number(filterClassId));
  });

  const activeSub = task.submissions?.find((s: any) => s.id === activeSubmissionId);

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden bg-[#050505]">
        
      <nav className="glass-panel !rounded-none !border-l-0 !border-r-0 !border-t-0 px-6 py-3 shrink-0 flex items-center justify-between z-20 sticky top-0 bg-black/90">
          <div className="flex items-center gap-4">
              <Link href="/admin" className="btn-secondary !py-1.5 !px-3 !bg-white/5 !text-zinc-400 hover:!text-white hover:!bg-white/10 text-xs flex items-center gap-2">
                 &larr; Wróć
              </Link>
              <div className="w-px h-6 bg-white/10"></div>
              <div>
                  <h1 className="font-bold tracking-tight text-white mb-0.5 text-sm">{task.title}</h1>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-blue-400 font-bold">{task.language}</span> • <span className="opacity-70">Zakończenie: {new Date(task.deadline).toLocaleString()}</span>
                  </p>
              </div>
          </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-80 lg:w-96 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] space-y-4">
                <div>
                   <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-1">Filtruj Grupę</h3>
                   <select 
                       value={filterClassId} 
                       onChange={(e) => setFilterClassId(e.target.value)}
                       className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
                   >
                       <option value="all">Wszyscy uczestnicy</option>
                       {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 custom-scrollbar">
                {filteredSubmissions?.map((sub: any) => {
                    const isActive = sub.id === activeSubmissionId;
                    const isGraded = sub.grade !== null && sub.grade !== undefined;
                    return (
                        <div 
                            key={sub.id} 
                            onClick={() => setActiveSubmissionId(sub.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                isActive 
                                ? 'bg-blue-600/10 border-blue-500/30' 
                                : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-1.5">
                                <span className={`font-semibold text-sm ${isActive ? 'text-blue-100' : 'text-zinc-300'}`}>{sub.user.name}</span>
                                {isGraded ? (
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">OCENIONE ({sub.grade})</span>
                                ) : (
                                    <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded text-[10px] font-bold">BRAK OCENY</span>
                                )}
                            </div>
                            <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                                <span className="truncate max-w-[150px]">{sub.user.email}</span>
                                <span>{sub.type === 'zip' ? '📦 ZIP' : '💻 CODE'}</span>
                            </div>
                        </div>
                    );
                })}

                {filteredSubmissions?.length === 0 && (
                    <div className="p-12 text-center text-zinc-600 text-xs italic">
                        Brak zgłoszeń od tej grupy.
                    </div>
                )}
            </div>
        </aside>

        <section className="flex-1 flex flex-col bg-[#050505] overflow-y-auto relative">
            {activeSub ? (
                <div className="flex flex-col h-full">
                    <div className="flex-1 flex flex-col overflow-hidden min-h-[400px]">
                        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 shrink-0 flex justify-between items-center">
                            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span> {activeSub.user.name} 
                            </span>
                            <span className="text-[10px] text-zinc-600 font-mono italic">Oddano: {new Date(activeSub.updatedAt).toLocaleString()}</span>
                        </div>
                        
                        <div className="flex-1 overflow-auto bg-[#1e1e1e]">
                            {activeSub.type === 'zip' || activeSub.codeContent?.startsWith('[ZIP_FILE]') ? (
                                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                    <span className="text-8xl mb-8 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">📦</span>
                                    <h3 className="text-2xl font-bold text-white mb-2">Paczka Projektowa (ZIP)</h3>
                                    <p className="text-zinc-500 text-sm mb-10 max-w-sm shrink-0">Pobierz archiwum, aby przejrzeć pełną strukturę plików projektu ucznia lokalnie.</p>
                                    <a 
                                        href={`http://localhost:4000/${activeSub.codeContent.replace('[ZIP_FILE] ', '').replace(/^uploads\//, 'uploads/')}`} 
                                        target="_blank" 
                                        className="btn-primary !bg-zinc-100 !text-black hover:!bg-white !py-4 px-16 text-sm font-bold tracking-widest uppercase transition-all shadow-[0_10px_40px_rgba(255,255,255,0.05)]"
                                        download
                                    >
                                        Pobierz Archiwum
                                    </a>
                                </div>
                            ) : (
                                <div className="p-8 font-mono text-[13px] text-emerald-400 leading-relaxed whitespace-pre min-h-full">
                                    {activeSub.codeContent || '// Brak kodu do wyświetlenia'}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#0f0f0f] border-t border-zinc-800/50 p-6 shrink-0 z-10">
                        <div className="max-w-5xl flex flex-col md:flex-row gap-4 items-stretch md:items-end">
                            <div className="w-32 shrink-0">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-2 ml-1 italic">Wartość (1-6)</label>
                                <input 
                                    type="number" min="1" max="6"
                                    className="input-field !bg-black !border-zinc-800 !py-3 !text-2xl font-black text-center text-blue-400 focus:!border-blue-500/50"
                                    value={gradeInput[activeSub.id] || activeSub.grade || ''}
                                    onChange={(e) => setGradeInput({ ...gradeInput, [activeSub.id]: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex-1 relative">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-2 ml-1 italic">Uzasadnienie / Komentarz</label>
                                <textarea 
                                    placeholder="Napisz co uczeń zrobił dobrze, a nad czym musi popracować..."
                                    className="input-field !bg-black !border-zinc-800 !py-3 resize-none h-[54px] overflow-hidden"
                                    value={feedbackInput[activeSub.id] || activeSub.feedback || ''}
                                    onChange={(e) => setFeedbackInput({ ...feedbackInput, [activeSub.id]: e.target.value })}
                                />
                            </div>
                            <button 
                                onClick={() => handleGrade(activeSub.id)} 
                                className="btn-primary !py-4 px-10 font-bold uppercase tracking-widest text-xs bg-blue-600 hover:bg-blue-500 border-none shadow-[0_0_20px_rgba(37,99,235,0.2)] shrink-0 h-[54px]"
                            >
                                Zatwierdź
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 text-center">
                    <span className="text-5xl mb-6">🔍</span>
                    <p className="font-bold text-xl uppercase tracking-tighter">Wybierz ucznia do weryfikacji</p>
                </div>
            )}
        </section>
      </main>
    </div>
  );
}
