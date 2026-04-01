'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { php } from '@codemirror/lang-php';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { sql } from '@codemirror/lang-sql';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';
import { apiFetch } from '@/lib/api';

export default function AdminTaskDetails() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { token, user, _hasHydrated } = useAuthStore();
  
  const [task, setTask] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [activeSubmissionId, setActiveSubmissionId] = useState<number | null>(null);
  const [filterClassId, setFilterClassId] = useState<string>('all');
  
  const [gradeInput, setGradeInput] = useState<{ [key: number]: number }>({});
  const [feedbackInput, setFeedbackInput] = useState<{ [key: number]: string }>({});

  const [archiveFileList, setArchiveFileList] = useState<string[]>([]);
  const [selectedFileInArchive, setSelectedFileInArchive] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!token || user?.role !== 'admin') return router.push('/login');

    const loadData = async () => {
        try {
            const taskRes = await apiFetch(`/tasks/${id}`);
            const taskData = await taskRes.json();
            setTask(taskData);
            
            const clsRes = await apiFetch('/classes');
            const clsData = await clsRes.json();
            setClasses(Array.isArray(clsData) ? clsData : []);

            if (taskData?.submissions?.length > 0) {
                const toReview = taskData.submissions.find((s: any) => !s.grade);
                setActiveSubmissionId(toReview ? toReview.id : taskData.submissions[0].id);
            }
        } catch(err) { console.error(err); }
    };
    loadData();
  }, [id, token, user, router, _hasHydrated]);

  useEffect(() => {
    if (!activeSubmissionId) return;
    const sub = task?.submissions?.find((s: any) => s.id === activeSubmissionId);
    if (sub && sub.type === 'zip') {
        setIsLoadingArchive(true);
        setArchiveFileList([]);
        setSelectedFileInArchive(null);
        setFileContent('');

        apiFetch(`/submissions/${sub.id}/explore`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setArchiveFileList([]);
                    alert(`Błąd archiwum: ${data.error}`);
                } else if (data.files) {
                    const fileNames = data.files.map((f: any) => f.path || f);
                    setArchiveFileList(fileNames);
                    const first = fileNames.find((f: string) => f.toLowerCase().includes('main') || f.toLowerCase().includes('index')) || fileNames[0];
                    if (first) setSelectedFileInArchive(first);
                }
            })
            .catch(err => {
                console.error(err);
                alert('Błąd połączenia przy eksploracji archiwum.');
            })
            .finally(() => setIsLoadingArchive(false));
    }
  }, [activeSubmissionId, task]);

  useEffect(() => {
    if (!activeSubmissionId || !selectedFileInArchive) return;
    const sub = task?.submissions?.find((s: any) => s.id === activeSubmissionId);
    if (sub && sub.type === 'zip') {
        setIsLoadingFile(true);
        apiFetch(`/submissions/${sub.id}/file-content?fileInside=${encodeURIComponent(selectedFileInArchive)}`)
            .then(res => res.json())
            .then(data => {
                setFileContent(data.content || 'Binary payload.');
            })
            .catch(() => setFileContent('Read error.'))
            .finally(() => setIsLoadingFile(false));
    }
  }, [selectedFileInArchive, activeSubmissionId, task]);

  const handleGrade = async (submissionId: number) => {
    try {
      const res = await apiFetch(`/submissions/${submissionId}/grade`, {
        method: 'PUT',
        body: JSON.stringify({ grade: gradeInput[submissionId], feedback: feedbackInput[submissionId] })
      });
      if (res.ok) {
        setTask((prev: any) => ({
          ...prev, submissions: prev.submissions.map((s: any) => s.id === submissionId ? { ...s, grade: gradeInput[submissionId], feedback: feedbackInput[submissionId] } : s)
        }));
      }
    } catch(err) { console.error(err); }
  };

  const handleLogout = () => { useAuthStore.getState().logout(); router.push('/login'); };

  const getLangExtension = (filename: string) => {
      const ext = filename.split('.').pop()?.toLowerCase();
      switch(ext) {
          case 'js': case 'ts': case 'jsx': case 'tsx': return javascript({ jsx: true, typescript: true });
          case 'py': return python();
          case 'cpp': return cpp();
          case 'php': return php();
          case 'java': return java();
          case 'rs': return rust();
          case 'go': return go();
          case 'sql': return sql();
          case 'html': return html();
          case 'css': return css();
          default: return javascript();
      }
  };

  if (!_hasHydrated) return null;
  if (!task) return <div className="min-h-screen bg-black" />;

  const filteredSubmissions = task.submissions?.filter((s: any) => {
      if (filterClassId === 'all') return true;
      return s.user.classUsers?.some((cu: any) => cu.classId === Number(filterClassId));
  });

  const activeSub = task.submissions?.find((s: any) => s.id === activeSubmissionId);

  return (
    <div className="min-h-screen flex h-screen overflow-hidden bg-[#050505] text-[#e4e4e7] text-[9px]">
      
      {/* 1. NARROWER SIDEBAR */}
      <aside className="w-64 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white shadow-lg text-sm italic uppercase italic">A</div>
                <h1 className="text-[11px] font-black tracking-tighter uppercase leading-tight italic opacity-40">Review console</h1>
              </div>
          </div>
          <div className="h-px bg-white/5 mb-4"></div>
          
          <div className="px-4 mb-4">
             <select 
                value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}
                className="w-full bg-black border border-white/5 rounded-xl p-2.5 text-[8px] font-black uppercase text-blue-500 outline-none appearance-none cursor-pointer"
             >
                <option value="all">WSZYSCY UCZESTNICY</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar pb-10">
              {filteredSubmissions?.map((sub: any) => (
                  <div 
                      key={sub.id} onClick={() => setActiveSubmissionId(sub.id)}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${sub.id === activeSubmissionId ? 'bg-blue-600/10 border-blue-600/30 text-white' : 'bg-transparent border-transparent text-zinc-600 hover:text-white'}`}
                  >
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest truncate">{sub.user.name}</span>
                        <span className="text-[7px] font-bold opacity-40 uppercase">{sub.type === 'zip' ? '📦 Archive' : '📄 Code'}</span>
                      </div>
                      {sub.grade && <span className="text-[8px] font-black bg-blue-600/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-600/10">{sub.grade}</span>}
                  </div>
              ))}
          </nav>
      </aside>

      {/* 2. MAIN CENTER HUD */}
      <section className="flex-1 flex flex-col overflow-hidden relative">
          
          <header className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505]">
              <div>
                  <h1 className="text-lg font-black text-white tracking-widest uppercase truncate max-w-sm italic opacity-80">{task.title}</h1>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={handleLogout} className="text-[8px] font-black uppercase tracking-widest text-red-600 border border-red-600/20 hover:bg-red-600 hover:text-white px-5 py-1.5 rounded-lg transition-all">LOGOUT</button>
                  <Link href="/admin" className="text-zinc-600 hover:text-white text-[8px] font-black uppercase tracking-widest border border-white/5 px-5 py-1.5 rounded-lg transition-all">BACK</Link>
              </div>
          </header>

          <div className="flex-1 flex overflow-hidden">
              {activeSub?.type === 'zip' && (
                  <div className="w-56 border-r border-white/5 bg-[#080808] flex flex-col shrink-0 animate-in slide-in-from-left duration-500">
                      <div className="p-4 pb-2 text-[7px] font-black uppercase tracking-[0.4em] text-zinc-800 flex justify-between items-center">
                        <span>Archive FS</span>
                        <span className="text-[6px] bg-blue-600/20 px-1 rounded text-blue-400">7Z/ZIP/RAR</span>
                      </div>
                      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 custom-scrollbar pb-10">
                          {isLoadingArchive ? (
                              <div className="p-10 text-center text-[7px] font-black opacity-20 animate-pulse tracking-widest uppercase">Syncing Drive...</div>
                          ) : archiveFileList.length === 0 ? (
                              <div className="p-10 text-center text-[7px] font-black opacity-20 uppercase tracking-widest">No clean source code found</div>
                          ) : (
                              <div className="space-y-0.5 pb-10">
                                  {(() => {
                                      // Budujemy drzewo z płaskiej listy
                                      const tree: any = {};
                                      const garbageDirs = ['node_modules', '.git', '__macosx', '.ds_store', '.idea', '.vscode', 'bin', 'obj', 'dist', 'build', '.next', 'target', 'vendor', 'out', 'coverage', '.dfx'];
                                      const garbageFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock', '.gitignore', '.eslintrc', '.prettierrc', 'readme.md', 'license', 'changelog'];
                                      const garbageExts = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.exe', '.dll', '.so', '.pyc', '.class'];
                                      
                                      archiveFileList.forEach(path => {
                                          const parts = path.split(/[\\/]/);
                                          const fileName = parts[parts.length - 1].toLowerCase();
                                          const fileExt = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
                                          
                                          // 1. Filtrowanie folderów
                                          if (parts.some(p => garbageDirs.includes(p.toLowerCase()))) return;
                                          // 2. Filtrowanie konkretnych nazw plików
                                          if (garbageFiles.includes(fileName)) return;
                                          // 3. Filtrowanie rozszerzeń binarnych/nie-kodowych
                                          if (garbageExts.includes(fileExt)) return;
                                          
                                          let current = tree;
                                          parts.forEach((part, i) => {
                                              if (!current[part]) {
                                                  current[part] = i === parts.length - 1 ? { __file: path } : {};
                                              }
                                              current = current[part];
                                          });
                                      });

                                      // Rekurencyjna funkcja renderująca
                                      const renderTree = (node: any, depth = 0, prefix = '') => {
                                          return Object.entries(node).map(([name, value]: [string, any]) => {
                                              const isFile = value.__file !== undefined;
                                              const fullPath = isFile ? value.__file : null;
                                              const currentPrefix = prefix ? `${prefix}/${name}` : name;

                                              if (isFile) {
                                                  return (
                                                      <button 
                                                        key={fullPath} 
                                                        onClick={() => setSelectedFileInArchive(fullPath)}
                                                        className={`w-full text-left px-2 py-1.5 rounded-lg text-[8px] truncate transition-all flex items-center gap-1.5 ${selectedFileInArchive === fullPath ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
                                                        style={{ paddingLeft: `${depth * 10 + 8}px` }}
                                                      >
                                                          <span className="opacity-40">📄</span> {name}
                                                      </button>
                                                  );
                                              } else {
                                                  const children = renderTree(value, depth + 1, currentPrefix);
                                                  if (children.length === 0) return null; // Ukrywamy puste foldery po filtracji
                                                  return (
                                                      <div key={currentPrefix} className="space-y-0.5">
                                                          <div 
                                                            className="px-2 py-1.5 text-[8px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-1.5 opacity-50"
                                                            style={{ paddingLeft: `${depth * 10 + 8}px` }}
                                                          >
                                                              <span className="opacity-40 text-xs leading-none">📁</span> {name}
                                                          </div>
                                                          {children}
                                                      </div>
                                                  );
                                              }
                                          });
                                      };

                                      return renderTree(tree);
                                  })()}
                              </div>
                          )}
                      </div>
                      <div className="p-3 bg-black">
                          <a href={`http://localhost:4000/${activeSub.codeContent.replace('[ZIP_FILE] ', '')}`} download className="w-full text-[8px] font-black border border-white/5 p-3 rounded-xl text-center block text-zinc-700 hover:text-white hover:bg-white/5 transition-all uppercase italic">Download RAW</a>
                      </div>
                  </div>
              )}

              <div className="flex-1 bg-[#111] flex flex-col relative">
                  <div className="h-8 bg-black/40 border-b border-white/5 flex items-center px-8 text-[7px] font-black uppercase tracking-[0.5em] text-zinc-800 italic">
                      {selectedFileInArchive || 'Source Preview'} {isLoadingFile && <span className="ml-4 animate-pulse text-blue-600">Syncing...</span>}
                  </div>
                  <div className="flex-1 overflow-auto">
                    <CodeMirror
                        value={activeSub?.type === 'zip' ? fileContent : (activeSub?.codeContent || '')}
                        height="100%" theme={oneDark} readOnly
                        extensions={[getLangExtension(selectedFileInArchive || ('file.' + task.language))]}
                        className="h-full text-[13px]"
                    />
                  </div>
              </div>
          </div>

          {/* 3. GRADING TERMINAL COMPACT */}
          {activeSub ? (
              <div className="h-24 bg-[#0a0a0a] border-t border-white/5 p-4 flex items-center justify-between px-10 shadow-[0_-30px_90px_rgba(0,0,0,0.8)] z-50">
                  <div className="flex items-center gap-6 flex-1">
                      <div className="w-20">
                          <label className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-800 mb-1 block text-center">SCORE</label>
                          <input 
                              type="number" min="1" max="6"
                              className="w-full bg-black border border-white/5 rounded-xl h-12 text-center text-blue-500 font-black text-2xl outline-none focus:border-blue-600/30 transition-all font-mono shadow-2xl"
                              value={gradeInput[activeSub.id] || activeSub.grade || ''}
                              onChange={(e) => setGradeInput({ ...gradeInput, [activeSub.id]: Number(e.target.value) })}
                          />
                      </div>
                      <div className="flex-1">
                          <label className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-800 mb-1 block ml-3">FEEDBACK NOTES</label>
                          <input 
                              className="w-full bg-black border border-white/5 rounded-xl h-12 px-6 text-[10px] text-zinc-400 outline-none focus:border-blue-600/20 transition-all"
                              placeholder="Technical review comments..."
                              value={feedbackInput[activeSub.id] || activeSub.feedback || ''}
                              onChange={(e) => setFeedbackInput({ ...feedbackInput, [activeSub.id]: e.target.value })}
                          />
                      </div>
                      <button onClick={() => handleGrade(activeSub.id)} className="bg-white hover:bg-zinc-200 text-black px-10 h-12 rounded-xl font-black uppercase text-[10px] tracking-[0.3em] transition-all shadow-2xl active:scale-95">OCEŃ</button>
                  </div>
              </div>
          ) : (
              <div className="h-24 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-center text-zinc-900 font-black uppercase text-[8px] tracking-[0.5em] opacity-40">Select submission to initialize.</div>
          )}
      </section>
    </div>
  );
}
