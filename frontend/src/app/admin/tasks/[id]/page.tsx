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
    const [filterClassId, setFilterClassId] = useState('all');
    const [showReviewed, setShowReviewed] = useState(false);
    const [activeFile, setActiveFile] = useState<string | null>(null);

    const [grade, setGrade] = useState('');
    const [feedback, setFeedback] = useState('');
    const [canEditAfterGrade, setCanEditAfterGrade] = useState(false);
    const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

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
                    const toReview = taskData.submissions.find((s: any) => !s.status || s.status === 'pending');
                    setActiveSubmissionId(toReview ? toReview.id : null);
                }
            } catch (err) { console.error(err); }
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

    const handleSubmitGrade = async () => {
        if (!activeSubmissionId) return;
        setIsSubmittingGrade(true);
        try {
            await apiFetch(`/submissions/${activeSubmissionId}/grade`, {
                method: 'PUT',
                // canEditAfterGrade = true oznacza "LOCK EDIT aktywny" → canEdit: false w bazie
                // grade wysyłamy jako string — backend zapisuje do pola varchar
                body: JSON.stringify({ grade: grade.trim(), feedback, canEdit: !canEditAfterGrade }),
            });
            if (task) {
                const res = await apiFetch(`/tasks/${task.id}`);
                const freshTask = await res.json();
                setTask(freshTask);

                // Przełącz na kolejną oczekującą submisję
                const nextPending = freshTask.submissions?.find(
                    (s: any) => s.id !== activeSubmissionId && (!s.status || s.status === 'pending')
                );
                setActiveSubmissionId(nextPending?.id ?? null);
                setGrade('');
                setFeedback('');
                setCanEditAfterGrade(false);
            }
        } catch (err) { alert('Błąd przy ocenianiu.'); }
        setIsSubmittingGrade(false);
    };

    const handleReject = async () => {
        if (!activeSubmissionId || !confirm('Czy na pewno odrzucić to zadanie? (Uczeń będzie mógł wysłać je ponownie)')) return;
        try {
            await apiFetch(`/submissions/${activeSubmissionId}/reject`, {
                method: 'POST',
                body: JSON.stringify({ feedback: feedback || 'Zadanie odrzucone przez administratora.' })
            });
            if (task) {
                const res = await apiFetch(`/tasks/${task.id}`);
                const freshTask = await res.json();
                setTask(freshTask);

                // Przełącz na kolejną oczekującą submisję (nie odrzuconą, nie ocenioną)
                const nextPending = freshTask.submissions?.find(
                    (s: any) => s.id !== activeSubmissionId && (!s.status || s.status === 'pending')
                );
                setActiveSubmissionId(nextPending?.id ?? null);
                setGrade('');
                setFeedback('');
            }
        } catch (err) { alert('Błąd przy odrzucaniu.'); }
    };

    const handleDeleteSub = async (subId: number) => {
        if (!confirm('Usunąć tę submisję na stałe z serwera?')) return;
        try {
            await apiFetch(`/submissions/${subId}`, { method: 'DELETE' });
            if (task) {
                const res = await apiFetch(`/tasks/${task.id}`);
                const data = await res.json();
                setTask(data);
                if (activeSubmissionId === subId) {
                    const nextPending = data.submissions?.find((s: any) => (!s.status || s.status === 'pending'));
                    setActiveSubmissionId(nextPending?.id ?? null);
                }
            }
        } catch (err) { alert('Błąd przy usuwaniu.'); }
    };

    const activeSub = task?.submissions?.find((s: any) => s.id === activeSubmissionId);
    useEffect(() => {
        if (activeSub) {
            setGrade(activeSub.grade !== null && activeSub.grade !== undefined ? String(activeSub.grade) : '');
            setFeedback(activeSub.feedback || '');
            // canEdit=false w bazie = zablokowany = toggle LOCK EDIT powinien być ON (true)
            setCanEditAfterGrade(!(activeSub.canEdit ?? true));
        }
    }, [activeSub]);

    const handleLogout = () => { useAuthStore.getState().logout(); router.push('/login'); };

    const getLangExtension = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
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
        // 1. Filtr klasowy
        const classMatch = !filterClassId || filterClassId === 'all' || s.user?.classUsers?.some((cu: any) => cu.classId === Number(filterClassId));
        if (!classMatch) return false;

        // 2. Filtr "Reviewed" (odrzucone/ocenione)
        if (!showReviewed) {
            if (s.status === 'rejected' || s.status === 'graded') return false;
        }

        return true;
    }) || [];


    return (
        <div className="min-h-screen flex h-screen overflow-hidden bg-[#050505] text-[#e4e4e7] text-[13px]">

            {/* 1. NARROWER SIDEBAR */}
            <aside className="w-64 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 overflow-hidden">
                <div className="p-4 pb-2">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white shadow-lg text-sm italic uppercase">A</div>
                            <h1 className="text-[12px] font-black tracking-tighter uppercase leading-tight italic text-zinc-400">Review console</h1>
                        </div>
                        <button
                            onClick={() => setShowReviewed(!showReviewed)}
                            className={`text-[10px] font-black px-2.5 py-1 rounded transition-all uppercase tracking-tighter border ${showReviewed ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'}`}
                        >
                            {showReviewed ? '👁️ Wszystkie' : '🎯 Oczekujące'}
                        </button>
                    </div>
                </div>
                <div className="h-px bg-white/5 mb-4"></div>

                <div className="px-4 mb-4">
                    <select
                        value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-xl p-2.5 text-[11px] font-black uppercase text-blue-400 outline-none appearance-none cursor-pointer"
                    >
                        <option value="all">WSZYSCY UCZESTNICY</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar pb-10">
                    {filteredSubmissions && filteredSubmissions.length > 0 ? (
                        filteredSubmissions.map((sub: any) => (
                            <div
                                key={sub.id} onClick={() => setActiveSubmissionId(sub.id)}
                                className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${sub.id === activeSubmissionId ? 'bg-blue-600/10 border-blue-600/30 text-white shadow-[0_0_20px_rgba(37,99,235,0.1)]' : 'bg-transparent border-transparent text-zinc-600 hover:text-white'}`}
                            >
                                <div className="flex flex-col flex-1 truncate">
                                    <span className="text-[11px] font-black uppercase tracking-widest truncate">{sub.user?.name || 'Student ID: ' + sub.userId}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">{sub.type === 'zip' ? '📦 Archiwum' : '📄 Kod'}</span>
                                        {sub.status === 'rejected' && <span className="text-[9px] font-black text-red-500 uppercase px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 italic">Odrzucone</span>}
                                        {sub.status === 'graded' && <span className="text-[9px] font-black text-emerald-500 uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 italic">Ocenione</span>}
                                        {(!sub.status || sub.status === 'pending') && <span className="text-[9px] font-black text-zinc-400 uppercase px-1.5 py-0.5 rounded bg-zinc-500/10 border border-zinc-500/20 italic animate-pulse">Oczekuje</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(sub.grade !== null && sub.grade !== undefined) && <span className="text-[11px] font-black bg-blue-600 text-white px-2 py-0.5 rounded border border-blue-600/10 shadow-lg">{sub.grade}</span>}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSub(sub.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-red-600/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="USUŃ NA STAŁE"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-10 text-center text-[8px] font-black uppercase tracking-[0.3em] opacity-20 italic">Brak przesłanych rozwiązań</div>
                    )}
                </nav>
            </aside>

            {/* 2. MAIN CENTER HUD */}
            <section className="flex-1 flex flex-col overflow-hidden relative">

                <header className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505]">
                    <div>
                        <h1 className="text-lg font-black text-white tracking-widest uppercase truncate max-w-sm italic opacity-80">{task.title}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="text-zinc-600 hover:text-white text-[8px] font-black uppercase tracking-widest border border-white/5 px-5 py-1.5 rounded-lg transition-all">← WRÓĆ</Link>
                    </div>
                </header>

                {activeSub ? (
                    <>
                        <div className="flex-1 flex overflow-hidden">
                            {activeSub?.type === 'zip' && (
                                <div className="w-56 border-r border-white/5 bg-[#080808] flex flex-col shrink-0 animate-in slide-in-from-left duration-500">
                                    <div className="p-4 pb-2 text-[7px] font-black uppercase tracking-[0.4em] text-zinc-800 flex justify-between items-center">
                                        <span>Archive FS</span>
                                        <span className="text-[6px] bg-blue-600/20 px-1 rounded text-blue-400">7Z/ZIP/RAR</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 custom-scrollbar pb-10">
                                        {isLoadingArchive ? (
                                            <div className="p-10 text-center text-[7px] font-black opacity-20 animate-pulse tracking-widest uppercase">Wczytywanie...</div>
                                        ) : archiveFileList.length === 0 ? (
                                            <div className="p-10 text-center text-[7px] font-black opacity-20 uppercase tracking-widest">Brak kodu źródłowego</div>
                                        ) : (
                                            <div className="space-y-0.5 pb-10">
                                                {(() => {
                                                    const tree: any = {};
                                                    const garbageDirs = ['node_modules', '.git', '__macosx', '.ds_store', '.idea', '.vscode', 'bin', 'obj', 'dist', 'build', '.next', 'target', 'vendor', 'out', 'coverage', '.dfx'];
                                                    const garbageFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock', '.gitignore', '.eslintrc', '.prettierrc', 'readme.md', 'license', 'changelog'];
                                                    const garbageExts = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.exe', '.dll', '.so', '.pyc', '.class'];

                                                    archiveFileList.forEach(path => {
                                                        const parts = path.split(/[\\/]/);
                                                        const fileName = parts[parts.length - 1].toLowerCase();
                                                        const fileExt = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';

                                                        if (parts.some(p => garbageDirs.includes(p.toLowerCase()))) return;
                                                        if (garbageFiles.includes(fileName)) return;
                                                        if (garbageExts.includes(fileExt)) return;

                                                        let current = tree;
                                                        parts.forEach((part, i) => {
                                                            if (!current[part]) {
                                                                current[part] = i === parts.length - 1 ? { __file: path } : {};
                                                            }
                                                            current = current[part];
                                                        });
                                                    });

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
                                                                if (children.length === 0) return null;
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
                                    {activeSub?.type === 'zip' ? (selectedFileInArchive || 'Wybierz plik...') : 'Podgląd kodu'} {isLoadingFile && <span className="ml-4 animate-pulse text-blue-600">Wczytywanie...</span>}
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
                        <div className="h-28 bg-[#0a0a0a] border-t border-white/5 p-4 flex items-center justify-between px-10 shadow-[0_-30px_90px_rgba(0,0,0,0.8)] z-50">
                            <div className="flex items-center gap-6 flex-1">
                                <div className="w-20">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-1 block text-center italic">OCENA</label>
                                    <input
                                        type="text"
                                        placeholder="np. +5, -4, 4.5"
                                        className="w-full bg-black border border-white/5 rounded-xl h-12 text-center text-blue-400 font-black text-xl outline-none focus:border-blue-600/30 transition-all font-mono shadow-2xl placeholder:text-zinc-700 placeholder:text-sm"
                                        value={grade}
                                        onChange={(e) => setGrade(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-1 block ml-3 italic">KOMENTARZ</label>
                                    <input
                                        className="w-full bg-black border border-white/5 rounded-xl h-12 px-6 text-[12px] text-zinc-300 outline-none focus:border-blue-600/20 transition-all font-bold placeholder:italic placeholder:text-zinc-600"
                                        placeholder="Komentarz do oceny..."
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col items-center gap-2 px-4 border-r border-white/5 mr-4 h-12 justify-center">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 italic">LOCK EDIT</label>
                                    <button
                                        onClick={() => setCanEditAfterGrade(!canEditAfterGrade)}
                                        className={`w-10 h-5 rounded-full relative transition-all ${!canEditAfterGrade ? 'bg-zinc-800' : 'bg-red-600/40 border border-red-500/30'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${!canEditAfterGrade ? 'left-1 bg-zinc-600' : 'left-6 bg-red-500 shadow-lg shadow-red-500/40'}`}></div>
                                    </button>
                                </div>
                                <div className="flex gap-2 h-12">
                                    <button
                                        onClick={handleReject}
                                        className="text-red-500 hover:bg-red-500 hover:text-white px-6 rounded-xl font-black uppercase text-[11px] tracking-[0.2em] transition-all border border-red-500/20 shadow-xl shadow-red-900/5 active:scale-95"
                                    >
                                        ODRZUĆ
                                    </button>
                                    <button
                                        disabled={isSubmittingGrade}
                                        onClick={handleSubmitGrade}
                                        className="bg-white hover:bg-zinc-200 text-black px-10 rounded-xl font-black uppercase text-[12px] tracking-[0.3em] transition-all shadow-2xl shadow-white/5 active:scale-95 flex items-center justify-center min-w-[140px]"
                                    >
                                        {isSubmittingGrade ? '...' : 'ZAPISZ OCENĘ'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 bg-[#050505] flex flex-col items-center justify-center text-[8px] uppercase tracking-[0.5em] z-0">
                        <div className="animate-pulse mb-4 text-xl font-black text-zinc-600 border border-white/5 px-10 py-5 rounded-2xl bg-[#0a0a0a] shadow-[0_0_50px_rgba(0,0,0,0.5)] italic">TERMINAL STANDBY</div>
                        <div className="text-[9px] text-zinc-500 font-bold tracking-widest opacity-60">Wybierz przesłane rozwiązanie z listy po lewej</div>
                    </div>
                )}
            </section>
        </div>
    );
}
