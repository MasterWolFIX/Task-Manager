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

export default function StudentDetails() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [task, setTask] = useState<any>(null);
  
  const [code, setCode] = useState('// Powodzenia ze zleceniem!\n// Twój kod zacznij pisać poniżej...\n\n');
  const [isLoaded, setIsLoaded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    if (!token || user?.role !== 'student') return router.push('/login');
    const id = window.location.pathname.split('/').pop();
    fetch(`http://localhost:4000/api/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
          setTask(data);
          const savedDraft = localStorage.getItem(`draft_task_${data.id}`);
          if (savedDraft) setCode(savedDraft);
          setIsLoaded(true);
      })
      .catch(console.error);
  }, [token, user, router]);

  useEffect(() => {
      if (isLoaded && task && code) {
          localStorage.setItem(`draft_task_${task.id}`, code);
      }
  }, [code, isLoaded, task]);

  const submitSolution = async () => {
    if (!confirm('Czy na pewno chcesz przesłać aktualny kod i zakończyć zadanie?')) return;
    try {
      const res = await fetch('http://localhost:4000/api/submissions/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      // Dodajemy do body, ale backend i tak odczyta z query jeśli tam też damy (bezpieczniej)
      formData.append('taskId', String(task.id));

      try {
          // Przekazujemy taskId w query, aby multer (backend) mógł go odczytać przed przetworzeniem pliku
          const res = await fetch(`http://localhost:4000/api/submissions/zip?taskId=${task.id}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
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
      switch(lang.toLowerCase()) {
          case 'python': return python();
          case 'c++': return cpp();
          case 'php': return php();
          case 'javascript': default: return javascript({ jsx: true });
      }
  };

  if (!task) return <div className="min-h-screen text-muted flex justify-center items-center">Baza udostępnia zawartość...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 glass-panel !rounded-none !border-l-0 !border-r-0 !border-t-0 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">S</div>
                <h1 className="font-semibold tracking-tight text-white">Moduł Wykonawczy</h1>
            </div>
            <div className="flex items-center gap-6 text-sm font-medium text-zinc-400">
                <Link href="/student" className="hover:text-white transition-colors">&larr; Dashboard</Link>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 lg:py-12 flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 space-y-6">
            <header className="mb-8">
                <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Instrukcja Zlecenia</h2>
                <h1 className="heading-primary !mb-2">{task.title}</h1>
                <div className="flex gap-2 text-xs font-mono text-blue-400">
                    <span className="bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">{task.language}</span>
                    <span className="bg-white/5 px-2 py-1 rounded border border-white/5 text-zinc-400">Deadline: {new Date(task.deadline).toLocaleDateString()}</span>
                </div>
            </header>

            <div className="glass-panel p-6 overflow-hidden">
                <p className="whitespace-pre-wrap text-zinc-300 text-sm leading-relaxed">{task.description}</p>
            </div>
            
            <div {...getRootProps()} className={`glass-panel p-6 border-dashed border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${isDragActive ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-800 hover:border-zinc-600 hover:bg-white/[0.02]'}`}>
                <input {...getInputProps()} />
                <span className={`text-3xl mb-2 transition-opacity ${isDragActive ? 'opacity-100 scale-110 text-blue-400' : 'opacity-30 group-hover:opacity-60'}`}>📦</span>
                <span className="text-sm font-medium text-zinc-300 mb-1">
                    {uploadProgress || (isDragActive ? 'Upuść archiwum tutaj...' : 'Miejsce na gotowe paczki (.zip)')}
                </span>
                <span className="text-xs text-muted">Kliknij lub przeciągnij plik ZIP z kodem, by go przesłać.</span>
            </div>
        </div>

        <div className="lg:col-span-2 flex flex-col border border-zinc-800 rounded-xl overflow-hidden shadow-2xl bg-[#282c34]">
            <div className="flex justify-between items-center bg-zinc-900 border-b border-zinc-800 px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></span>
                    <span className="ml-4 text-xs font-mono text-zinc-500 uppercase tracking-widest font-semibold">Plik: main.{task.language === 'python' ? 'py' : task.language === 'javascript' ? 'js' : task.language === 'php' ? 'php' : 'cpp'}</span>
                </div>
                
                <div className="flex items-center gap-4">
                    <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Autosave aktywny</span>
                    <button onClick={submitSolution} className="btn-primary !py-1.5 !px-4 !text-xs !font-bold !rounded shadow-blue-500/20 uppercase tracking-wider">
                        Prześlij Raport z Edytora
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full h-[600px] overflow-hidden text-base relative">
                <CodeMirror
                    value={code}
                    height="100%"
                    theme={oneDark}
                    extensions={[getLangExtension(task.language)]}
                    onChange={(val) => setCode(val)}
                    className="w-full h-full text-base absolute inset-0"
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
