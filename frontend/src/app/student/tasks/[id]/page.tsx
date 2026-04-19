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
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { sql } from '@codemirror/lang-sql';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';
import { useDropzone } from 'react-dropzone';
import { apiFetch } from '@/lib/api';

export default function StudentDetails() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { token, user, _hasHydrated } = useAuthStore();
    const [task, setTask] = useState<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [code, setCode] = useState('// Powodzenia ze zleceniem!\n// Twój kod zacznij pisać poniżej...\n\n');
    const [uploadProgress, setUploadProgress] = useState('');
    const [stagedFile, setStagedFile] = useState<File | null>(null);

    const fetchTask = async () => {
        try {
            const res = await apiFetch(`/tasks/${id}`);
            const data = await res.json();
            setTask(data);

            // Szukamy ostatniej submisji (może być kod lub zip)
            const mySub = data.submissions?.[0];
            const savedDraft = localStorage.getItem(`draft_task_${data.id}`);

            if (savedDraft) {
                setCode(savedDraft);
            } else if (mySub && mySub.type === 'code') {
                setCode(mySub.codeContent);
            }
            setIsLoaded(true);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!token || user?.role !== 'student') return router.push('/login');
        fetchTask();
    }, [id, token, user, router, _hasHydrated]);

    useEffect(() => {
        if (isLoaded && task?.id && code) {
            localStorage.setItem(`draft_task_${task.id}`, code);
        }
    }, [code, isLoaded, task]);

    const submitSolution = async () => {
        if (!confirm('Czy na pewno chcesz przesłać aktualny kod? Nadpisze to Twoje poprzednie zgłoszenie.')) return;
        try {
            const res = await apiFetch('/submissions/code', {
                method: 'POST',
                body: JSON.stringify({ taskId: task.id, codeContent: code, language: task.language })
            });
            if (res.ok) {
                localStorage.removeItem(`draft_task_${task.id}`);
                alert('Kod został wysłany pomyślnie!');
                fetchTask();
            }
        } catch (err) { alert('Błąd przy łączności z serwerem.'); }
    };

    const submitZipSolution = async () => {
        if (!stagedFile) return;
        setUploadProgress('Wysyłanie paczki...');
        const formData = new FormData();
        formData.append('file', stagedFile);
        formData.append('taskId', String(task.id));

        try {
            const res = await apiFetch(`/submissions/zip?taskId=${task.id}`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                setUploadProgress('Paczka wdrożona!');
                setStagedFile(null);
                alert('Projekt przesłany bazując na archiwum ZIP!');
                fetchTask();
            } else {
                const data = await res.json();
                setUploadProgress(`Błąd: ${data.error}`);
            }
        } catch (e) {
            setUploadProgress('Błąd sieci.');
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;
        const ext = file.name.toLowerCase();
        if (!ext.endsWith('.zip') && !ext.endsWith('.rar') && !ext.endsWith('.7z')) {
            alert('System akceptuje wyłącznie pliki archiwalne .zip, .rar oraz .7z!');
            return;
        }
        setStagedFile(file);
        setUploadProgress('');
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });

    const getLangExtension = (lang: string) => {
        const l = lang?.toLowerCase() || '';
        if (l.includes('javascript') || l.includes('typescript')) return javascript({ jsx: true, typescript: true });
        if (l.includes('python')) return python();
        if (l.includes('java')) return java();
        if (l.includes('c++')) return cpp();
        if (l.includes('php')) return php();
        if (l.includes('rust')) return rust();
        if (l.includes('go')) return go();
        if (l.includes('sql')) return sql();
        if (l.includes('html')) return html();
        if (l.includes('css')) return css();
        return javascript();
    };

    if (!_hasHydrated) return null;
    if (!task) return <div className="min-h-screen text-zinc-500 flex justify-center items-center bg-black font-black uppercase tracking-[0.5em] animate-pulse">Syncing Task...</div>;

    const mySub = task.submissions?.[0];
    const isDeadlinePassed = new Date(task.deadline) < new Date();
    const subType = task.submissionType || 'both';
    const isLocked = mySub?.canEdit === false;

    return (
        <div className="min-h-screen flex flex-col bg-[#050505] text-white">
            <nav className="sticky top-0 z-50 px-4 sm:px-8 py-4 bg-black/80 backdrop-blur-3xl border-b border-white/5">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link href="/student" className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center font-bold text-blue-400 hover:bg-blue-600/20 shrink-0">&larr;</Link>
                        <h1 className="font-black uppercase text-[10px] tracking-[0.3em] text-zinc-100 italic hidden sm:block">Eksplorator Zadań</h1>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {isLocked && (
                            <div className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-600/20 text-red-500 border border-red-500/20 animate-pulse">
                                🔒 ZABLOKOWANE
                            </div>
                        )}
                        <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${isDeadlinePassed ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                            {isDeadlinePassed ? 'ZAKOŃCZONE' : 'W TRAKCIE'}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-4 sm:p-8 lg:py-16 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">

                {/* LEWA KOLUMNA: DESCRIPTION & ZIP */}
                <div className="lg:col-span-4 space-y-12">
                    <header>
                        <div className="bg-blue-600/10 text-blue-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] inline-block mb-6 border border-blue-600/20 font-mono">
                            {task.language.toUpperCase()}
                        </div>
                        <h1 className="text-4xl font-black mb-4 tracking-tighter leading-none uppercase">{task.title}</h1>
                        <div className="flex flex-col gap-2">
                            <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest italic">{new Date(task.deadline).toLocaleString()}</p>
                            {mySub && (
                                <div className="flex flex-col gap-3 mt-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(35,99,235,0.8)]"></span>
                                        WYSŁANO: {mySub.type.toUpperCase()}
                                        {mySub.grade && <span className="ml-2 bg-blue-600 text-white px-2 py-0.5 rounded-md font-black">OCENA: {mySub.grade}</span>}
                                    </div>

                                    {mySub.status === 'rejected' && (
                                        <div className="bg-red-600/10 border border-red-500/20 p-5 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="text-red-500 font-black text-[9px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <span>⚠️</span> ZADANIE ODRZUCONE
                                            </div>
                                            <p className="text-[11px] text-zinc-400 font-medium italic">"{mySub.feedback}"</p>
                                            <div className="mt-3 text-[7px] text-red-500 opacity-60 font-black uppercase tracking-[0.2em]">Popraw błędy i wyślij ponownie</div>
                                        </div>
                                    )}

                                    {mySub.status === 'graded' && mySub.feedback && (
                                        <div className="bg-blue-600/10 border border-blue-600/10 p-5 rounded-2xl italic text-zinc-400 text-[11px] font-medium">
                                            <span className="text-blue-500 font-bold uppercase text-[7px] tracking-widest block mb-1">Feedback od nauczyciela:</span>
                                            "{mySub.feedback}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </header>

                    <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-all">
                            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M14,17H7V15H14V17M17,13H7V11H17V13M17,9H7V7H17V9M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z" /></svg>
                        </div>
                        <p className="whitespace-pre-wrap text-zinc-400 text-[14px] leading-relaxed font-medium relative z-10">{task.description}</p>
                    </div>

                    {/* AREA ZIP (Tylko jeśli dozwolone) */}
                    {(subType === 'zip' || subType === 'both') && (
                        <div className="space-y-6">
                            {!stagedFile ? (
                                <div
                                    {...getRootProps()}
                                    className={`relative rounded-3xl p-10 border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] ${(isDragActive || isLocked || isDeadlinePassed) ? (isLocked || isDeadlinePassed ? 'opacity-20 pointer-events-none' : 'border-blue-600 bg-blue-600/10') : 'border-zinc-800 bg-black/40 hover:border-zinc-600 hover:bg-white/[0.02]'}`}
                                >
                                    <input {...getInputProps()} />
                                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mb-4 border border-white/5">
                                        <span className="text-2xl">{isLocked ? '🔒' : '📦'}</span>
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">{isLocked ? 'Przesyłanie zablokowane' : 'Prześlij ZIP / RAR / 7Z'}</p>
                                </div>
                            ) : (
                                <div className="bg-blue-600/10 border border-blue-500/30 rounded-3xl p-8 flex flex-col items-center animate-in zoom-in-95 duration-300">
                                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mb-4 shadow-[0_0_50_rgba(37,99,235,0.3)]">
                                        <span className="text-3xl">🗳️</span>
                                    </div>
                                    <p className="text-white font-black text-[10px] mb-1 uppercase tracking-widest truncate max-w-full italic">{stagedFile.name}</p>
                                    <p className="text-blue-500 font-bold text-[9px] uppercase tracking-widest mb-8 opacity-60">{(stagedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    <div className="flex gap-4 w-full">
                                        <button onClick={() => setStagedFile(null)} className="flex-1 bg-black text-zinc-600 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white/5 hover:text-white transition-all font-black italic">Anuluj</button>
                                        <button onClick={submitZipSolution} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all font-black italic">Prześlij Paczkę</button>
                                    </div>
                                </div>
                            )}
                            {uploadProgress && (
                                <div className="bg-black/50 border border-white/5 p-4 rounded-2xl text-center">
                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] animate-pulse">{uploadProgress}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* PRAWA KOLUMNA: EDYTOR (Tylko jeśli dozwolone) */}
                <div className="lg:col-span-8">
                    {(subType === 'code' || subType === 'both') ? (
                        <div className="flex flex-col bg-[#080808] border border-white/5 rounded-[24px] sm:rounded-[40px] overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,0.9)] h-[460px] sm:h-[620px] lg:h-[820px] relative">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-black/40 border-b border-white/5 px-5 sm:px-10 py-4 sm:py-8 gap-3">
                                <div>
                                    <span className="text-[9px] font-black text-zinc-800 uppercase tracking-[0.5em] block mb-1 opacity-20 italic">Editor Console v2.0</span>
                                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] italic">{task.language} Workspace</h3>
                                </div>
                                <button
                                    onClick={submitSolution} disabled={isDeadlinePassed || isLocked}
                                    className={`h-12 sm:h-14 px-8 sm:px-12 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl transition-all active:scale-95 italic ${(isDeadlinePassed || isLocked) ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed opacity-40' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'}`}
                                >
                                    {isLocked ? 'ZABLOKOWANO' : (mySub ? 'Zaktualizuj Kod' : 'Wyślij Rozwiązanie')}
                                </button>
                            </div>

                            <div className={`flex-1 w-full overflow-hidden ${(isDeadlinePassed || isLocked) && 'opacity-30 grayscale pointer-events-none'}`}>
                                <CodeMirror
                                    value={code} height="100%" theme={oneDark}
                                    readOnly={isDeadlinePassed || isLocked}
                                    extensions={[getLangExtension(task.language)]}
                                    onChange={(val) => !(isDeadlinePassed || isLocked) && setCode(val)}
                                    className="w-full h-full text-[13px] sm:text-[16px]"
                                    basicSetup={{ lineNumbers: true, highlightActiveLine: true, bracketMatching: true, autocompletion: true, foldGutter: true }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#0a0a0a] border border-white/5 rounded-[24px] sm:rounded-[40px] h-full min-h-[280px] flex flex-col items-center justify-center p-10 sm:p-20 text-center">
                            <div className="w-24 h-24 rounded-3xl bg-zinc-900 flex items-center justify-center mb-8 border border-white/5 text-4xl shadow-2xl skew-x-3 opacity-20">📂</div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Kod źródłowy wymagany w paczce</h2>
                            <p className="text-zinc-600 max-w-sm text-sm font-medium leading-relaxed uppercase text-[10px] tracking-widest">To zadanie nie wspiera edycji online. Wszystkie pliki muszą zostać spakowane do formatu .zip i przesłane przez panel boczny.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
