'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { php } from '@codemirror/lang-php';
import { oneDark } from '@codemirror/theme-one-dark';
import { useDropzone } from 'react-dropzone';
import { apiFetch } from '@/lib/api';

export default function StudentDetails() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { token, user } = useAuthStore();
  const [task, setTask] = useState<any>(null);
  
  const [code, setCode] = useState('// Powodzenia ze zleceniem!\n// Twój kod zacznij pisać poniżej...\n\n');
  const [isLoaded, setIsLoaded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    if (!token || user?.role !== 'student') return router.push('/login');
    
    apiFetch(`/tasks/${id}`)
      .then(res => res.json())
      .then(data => {
          setTask(data);
          const savedDraft = localStorage.getItem(`draft_task_${data.id}`);
          if (savedDraft) setCode(savedDraft);
          setIsLoaded(true);
      })
      .catch(console.error);
  }, [id, token, user, router]);

  useEffect(() => {
      if (isLoaded && task?.id && code) {
          localStorage.setItem(`draft_task_${task.id}`, code);
      }
  }, [code, isLoaded, task]);

  const submitSolution = async () => {
    if (!confirm('Czy na pewno chcesz przesłać aktualny kod i zakończyć zadanie?')) return;
    try {
      const res = await apiFetch('/submissions/code', {
        method: 'POST',
        body: JSON.stringify({ taskId: task.id, codeContent: code, language: task.language })
      });
      if (res.ok) {
        localStorage.removeItem(`draft_task_${task.id}`);
        alert('Rozwiązanie zostało wysłane pomyślnie!');
        router.push('/student');
      }
    } catch(err) { alert('Błąd przy łączności z serwerem podczas publikacji pracy.'); }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      if (!file.name.endsWith('.zip')) {
          alert('Proszę wrzucać wyłącznie pliki z rozszerzeniem .zip!');
          return;
      }
      
      if (!confirm(`Czy na pewno chcesz przesłać plik "${file.name}" jako swoje rozwiązanie? Akcja ta nadpisze ewentualny kod z edytora.`)) return;

      setUploadProgress('Wysyłanie paczki...');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', String(task.id));

      try {
          const res = await apiFetch(`/submissions/zip?taskId=${task.id}`, {
              method: 'POST',
              body: formData
          });
          if (res.ok) {
              setUploadProgress('Paczka wdrożona z sukcesem!');
              setTimeout(() => {
                 alert('Projekt przesłany bazując na archiwum ZIP!');
                 router.push('/student');
              }, 500);
          } else {
              setUploadProgress('Błąd przy wysyłaniu pliku.');
          }
      } catch (e) {
          setUploadProgress('Błąd sieci.');
      }
  }, [task, token, router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
      onDrop, 
      accept: { 'application/zip': ['.zip'], 'application/x-zip-compressed': ['.zip'] },
      maxFiles: 1
  });

  const getLangExtension = (lang: string) => {
      switch(lang?.toLowerCase() || 'javascript') {
          case 'python': return python();
          case 'c++': return cpp();
          case 'php': return php();
          case 'javascript': default: return javascript({ jsx: true });
      }
  };

  if (!task) return <div className="min-h-screen text-muted flex justify-center items-center bg-black">Autoryzacja dostępu do arkusza...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">
      <nav className="sticky top-0 z-50 glass-panel !rounded-none !border-l-0 !border-r-0 !border-t-0 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">S</div>
                <h1 className="font-bold tracking-tight text-white uppercase text-xs tracking-[0.2em]">Arkusz Studencki</h1>
            </div>
            <div className="flex items-center gap-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                <Link href="/student" className="hover:text-white transition-all">&larr; PANEL GŁÓWNY</Link>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 lg:py-12 flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        <div className="lg:col-span-1 space-y-8">
            <header className="mb-0">
                <h2 className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-600 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Specyfikacja Wyzwania
                </h2>
                <h1 className="text-3xl font-bold text-white mb-3 tracking-tighter">{task.title}</h1>
                <div className="flex gap-2 text-[10px] font-black tracking-widest uppercase">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded shadow-blue-500/20">{task.language}</span>
                    <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded">DO: {new Date(task.deadline).toLocaleDateString()}</span>
                </div>
            </header>

            <div className="glass-panel p-6 border-zinc-800 bg-black/40">
                <p className="whitespace-pre-wrap text-zinc-400 text-sm leading-7 font-medium">{task.description}</p>
            </div>
            
            <div {...getRootProps()} className={`glass-panel p-8 border-dashed border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-900 hover:border-zinc-700 hover:bg-white/[0.01]'}`}>
                <input {...getInputProps()} />
                <span className={`text-4xl mb-4 transition-all duration-300 ${isDragActive ? 'scale-125 text-blue-400 rotate-12' : 'grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-60'}`}>📦</span>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">
                    {uploadProgress || (isDragActive ? 'Puszczaj!' : 'PRZEŚLIJ ARCHIWUM .ZIP')}
                </span>
                <span className="text-[10px] text-zinc-600 font-medium italic">Wszystkie pliki projektu w jednej paczce</span>
            </div>
        </div>

        <div className="lg:col-span-2 flex flex-col border border-zinc-800 rounded-2xl overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.8)] bg-[#1e1e1e]">
            <div className="flex justify-between items-center bg-zinc-900/50 border-b border-white/5 px-6 py-4">
                <div className="flex items-center gap-2 pr-6 border-r border-white/5">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div>
                </div>
                <span className="ml-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest flex-1">main.{task.language === 'python' ? 'py' : task.language === 'javascript' ? 'js' : task.language === 'php' ? 'php' : 'cpp'} — EDITOR SDK v2</span>
                
                <div className="flex items-center gap-6">
                    <span className="text-[9px] text-emerald-500/50 font-black uppercase tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span> CLOUD SYNC
                    </span>
                    <button onClick={submitSolution} className="btn-primary !py-2 px-6 !text-[10px] !font-black !rounded-lg bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)] uppercase tracking-widest border-none">
                        PRZEŚLIJ KOD
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full h-[650px] overflow-hidden text-base">
                <CodeMirror
                    value={code}
                    height="100%"
                    theme={oneDark}
                    extensions={[getLangExtension(task.language)]}
                    onChange={(val) => setCode(val)}
                    className="w-full h-full text-base"
                    basicSetup={{
                        lineNumbers: true,
                        highlightActiveLine: true,
                        bracketMatching: true,
                        autocompletion: true,
                    }}
                />
            </div>
        </div>
      </main>
    </div>
  );
}
