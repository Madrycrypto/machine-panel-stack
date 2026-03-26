"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Play, RotateCcw, Wrench, Trash2, Crosshair, AlertTriangle } from "lucide-react";
import clsx from "clsx";

type GameStage = "idle" | "shadowboard" | "visualsearch" | "procedural" | "finished";

export default function FiveSAssessment() {
    const [stage, setStage] = useState<GameStage>("idle");
    const [timeLeft, setTimeLeft] = useState(0);
    const [score, setScore] = useState({ shadowboard: 0, shadowboardCleaned: false, visualsearch: 0, procedural: 0 });

    // --- Shadowboard State ---
    const [sbWrenchPlaced, setSbWrenchPlaced] = useState(false);
    const [sbTrashRemoved, setSbTrashRemoved] = useState(0);

    // --- Visual Search State ---
    const [vsTargets, setVsTargets] = useState<{ id: number, x: number, y: number, found: boolean }[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- Procedural State ---
    const [prPallet, setPrPallet] = useState<(string | null)[]>(Array(9).fill(null));
    const [prQueue, setPrQueue] = useState<string[]>([]);
    const [prMistakes, setPrMistakes] = useState(0);
    const prTimerRef = useRef<NodeJS.Timeout>(null);

    const startTest = () => {
        setScore({ shadowboard: 0, shadowboardCleaned: false, visualsearch: 0, procedural: 0 });
        startShadowboard();
    };

    // ==========================================
    // STAGE 1: SHADOWBOARD (9 seconds)
    // ==========================================
    const startShadowboard = () => {
        setStage("shadowboard");
        setTimeLeft(9);
        setSbWrenchPlaced(false);
        setSbTrashRemoved(0);
    };

    // ==========================================
    // STAGE 2: VISUAL SEARCH (12 seconds)
    // ==========================================
    const startVisualSearch = () => {
        setStage("visualsearch");
        setTimeLeft(12);
        // Generate 5 targets hidden among chaos
        const targets = Array.from({ length: 5 }).map((_, i) => ({
            id: i,
            x: Math.random() * 80 + 10,
            y: Math.random() * 80 + 10,
            found: false
        }));
        setVsTargets(targets);
    };

    // ==========================================
    // STAGE 3: PROCEDURAL (16 seconds)
    // ==========================================
    const startProcedural = () => {
        setStage("procedural");
        setTimeLeft(16);
        setPrPallet(Array(9).fill(null));
        setPrQueue(["red", "blue", "red", "blue", "red", "blue", "green", "green"]); // Green is the stressor
        setPrMistakes(0);

        // Auto feed queue
        if (prTimerRef.current) clearInterval(prTimerRef.current);
        prTimerRef.current = setInterval(() => {
            setPrQueue(prev => {
                const nextRandom = ["red", "blue", "green"][Math.floor(Math.random() * 3)];
                if (prev.length < 5) return [...prev, nextRandom];
                return prev;
            });
        }, 1800); // slightly faster feed
    };

    const finishTest = () => {
        setStage("finished");
        if (prTimerRef.current) clearInterval(prTimerRef.current);
    };

    // Global Timer
    useEffect(() => {
        if (stage === "idle" || stage === "finished") return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (stage === "shadowboard") {
                        // Save score
                        setScore(s => ({ ...s, shadowboardCleaned: sbTrashRemoved === 3 }));
                        setTimeout(startVisualSearch, 1000);
                    } else if (stage === "visualsearch") {
                        setTimeout(startProcedural, 1000);
                    } else if (stage === "procedural") {
                        finishTest();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [stage, sbTrashRemoved]);

    // Stage 1 Interactions
    const handleWrenchDragEnd = (e: any, info: any) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        // Check if near the shadow (approx center right)
        const x = info.point.x - rect.left;
        if (x > rect.width * 0.6) setSbWrenchPlaced(true);
    };

    // Stage 2 Interactions
    const handleFindTarget = (id: number) => {
        setVsTargets(prev => prev.map(t => t.id === id ? { ...t, found: true } : t));
        setScore(s => ({ ...s, visualsearch: s.visualsearch + 1 }));
    };

    // Stage 3 Interactions
    const attemptPlaceOnPallet = (color: string) => {
        const nextEmpty = prPallet.indexOf(null);
        if (nextEmpty === -1) {
            // Pallet full! If they still click, they are forcing it (Mistake)
            setPrMistakes(m => m + 1);
            return;
        }

        // Logic: Red must go on Even indexes, Blue on Odd. Green should be trashed.
        // Simplifying: Just let them place it, but check if they maintained an alternating pattern.
        const newPallet = [...prPallet];
        newPallet[nextEmpty] = color;
        setPrPallet(newPallet);

        setPrQueue(prev => prev.slice(1));
    };

    const attemptReject = () => {
        setPrQueue(prev => prev.slice(1));
        setScore(s => ({ ...s, procedural: s.procedural + 1 })); // Good decision under pressure
    };


    const evaluateProfile = () => {
        let isOrganized = true;
        let reasons = [];

        if (!score.shadowboardCleaned) {
            isOrganized = false;
            reasons.push("Zignorował śmieci na stanowisku w (pozostawił FOD).");
        } else {
            reasons.push("Naturalny odruch sprzątania (5S) przy minimalnej instrukcji.");
        }

        if (score.visualsearch < 4) {
            isOrganized = false;
            reasons.push("Chaotyczne skanowanie wzrokiem, niska precyzja pod presją czasu.");
        }

        if (prMistakes > 0) {
            isOrganized = false;
            reasons.push("Pod presją przepełnienia wciskał detale na siłę łamiąc procedurę.");
        }

        if (isOrganized) {
            return { title: "Wysoki Instynkt 5S i Organizacji", color: "text-emerald-500", desc: reasons.join(" ") };
        } else if (score.shadowboardCleaned || score.visualsearch >= 3) {
            return { title: "Przeciętna Organizacja", color: "text-blue-500", desc: reasons.join(" ") };
        } else {
            return { title: "Skłonność do Chaosu", color: "text-red-500", desc: reasons.join(" ") };
        }
    };


    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">

            {/* Header bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all h-20">
                <div className="flex items-center gap-6 w-full">
                    <div className="flex items-center gap-2">
                        <Clock className={timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-slate-500"} size={20} />
                        <span className={clsx("font-mono text-2xl font-bold", timeLeft <= 3 && "text-red-500")}>
                            00:{timeLeft.toString().padStart(2, "0")}
                        </span>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
                    <div className="text-sm font-medium text-slate-500 flex-1 flex justify-center gap-2">
                        <span className={clsx(stage === "shadowboard" ? "text-blue-600 font-bold" : "")}>1. Tablica Cieni</span>
                        <span>&rarr;</span>
                        <span className={clsx(stage === "visualsearch" ? "text-blue-600 font-bold" : "")}>2. Detekcja</span>
                        <span>&rarr;</span>
                        <span className={clsx(stage === "procedural" ? "text-blue-600 font-bold" : "")}>3. Paleta</span>
                    </div>
                </div>
            </div>

            <div
                ref={containerRef}
                className={clsx(
                    "relative w-full h-[500px] border-2 border-dashed rounded-3xl overflow-hidden touch-none select-none transition-colors",
                    stage !== "idle" && stage !== "finished" ? "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950" : "border-transparent bg-slate-100 dark:bg-slate-900 flex items-center justify-center"
                )}
            >
                {/* ============================================== */}
                {/* IDLE */}
                {/* ============================================== */}
                {stage === "idle" && (
                    <div className="text-center p-8 max-w-lg">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Play size={32} className="ml-1" />
                        </div>
                        <h3 className="text-xl font-bold mb-4">Zintegrowane Badanie Instynktu 5S</h3>
                        <p className="text-slate-500 mb-6 text-sm">
                            Trzy szybkie mini-gry badające naturalny odruch utrzymywania porządku, systematyczność szukania oraz radzenie sobie z przepełnieniem (awarią). <br /><br />
                            Bądź szybki. Wykorzystuj logikę miejsca pracy. Każda runda to zaledwie parę sekund.
                        </p>
                        <button
                            onClick={startTest}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-emerald-500/25"
                        >
                            Start (37s łącznie)
                        </button>
                    </div>
                )}

                {/* ============================================== */}
                {/* STAGE 1: SHADOWBOARD */}
                {/* ============================================== */}
                {stage === "shadowboard" && (
                    <div className="absolute inset-0 p-8 flex animate-in fade-in zoom-in-95">
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-xl font-black text-slate-900 bg-white px-6 py-3 rounded-2xl shadow-xl border-4 border-blue-500 z-50 text-center uppercase tracking-wide">CEL: "Przygotuj stanowisko do pracy"</div>

                        {/* The Shadowboard */}
                        <div className="absolute right-12 top-1/2 -translate-y-1/2 w-48 h-64 bg-slate-800 rounded-2xl border-4 border-slate-700 p-4 flex flex-col items-center justify-center gap-4">
                            <div className="text-xs text-slate-400 font-bold tracking-widest">TABLICA CIENI</div>
                            <div className={clsx(
                                "w-12 h-32 rounded-lg border-2 border-dashed transition-all duration-300 flex items-center justify-center",
                                sbWrenchPlaced ? "bg-slate-600 border-transparent box-shadow-inner text-slate-400" : "border-slate-500 bg-slate-800/50"
                            )}>
                                {sbWrenchPlaced ? <Wrench size={32} /> : "Klucz"}
                            </div>
                        </div>

                        {/* The Mess on the desk */}
                        {!sbWrenchPlaced && (
                            <motion.div
                                drag dragMomentum={false}
                                onDragEnd={handleWrenchDragEnd}
                                className="absolute left-[20%] top-[30%] w-12 h-32 bg-slate-400 rounded-lg cursor-grab active:cursor-grabbing flex items-center justify-center shadow-xl z-20"
                            ><Wrench size={32} className="text-slate-700" /></motion.div>
                        )}

                        {/* Trash items (Testing if they clean up) */}
                        {sbTrashRemoved < 1 && <motion.div onClick={() => setSbTrashRemoved(r => r + 1)} className="absolute left-[15%] top-[60%] w-8 h-8 rounded-full bg-red-500/50 cursor-pointer flex items-center justify-center text-xs opacity-70">Złom</motion.div>}
                        {sbTrashRemoved < 2 && <motion.div onClick={() => setSbTrashRemoved(r => r + 1)} className="absolute left-[35%] top-[20%] w-10 h-10 rounded-sm bg-orange-500/50 cursor-pointer flex items-center justify-center text-xs opacity-70">Złom</motion.div>}
                        {sbTrashRemoved < 3 && <motion.div onClick={() => setSbTrashRemoved(r => r + 1)} className="absolute left-[45%] top-[70%] w-12 h-6 rounded-md bg-yellow-500/50 cursor-pointer flex items-center justify-center text-xs opacity-70">Złom</motion.div>}

                        {/* Trash bin */}
                        <div className="absolute left-8 bottom-8 w-16 h-20 border-2 border-slate-400 rounded-b-xl rounded-t-sm flex flex-col items-center justify-end pb-2 opacity-50">
                            <Trash2 />
                        </div>
                    </div>
                )}

                {/* ============================================== */}
                {/* STAGE 2: VISUAL SEARCH */}
                {/* ============================================== */}
                {stage === "visualsearch" && (
                    <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-in slide-in-from-right-16 duration-300">
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-xl font-black text-slate-900 bg-white px-6 py-3 rounded-2xl shadow-xl border-4 border-emerald-500 z-50 text-center uppercase tracking-wide">CEL: Znajdź 5 <span className="text-emerald-500">ZIELONYCH</span> KROPEK w chaosie</div>

                        {/* Visual Noise */}
                        {Array.from({ length: 100 }).map((_, i) => (
                            <div key={`noise-${i}`} className="absolute w-4 h-4 rounded-sm bg-slate-300 dark:bg-slate-700 opacity-50" style={{ left: `${Math.random() * 95}%`, top: `${Math.random() * 95}%` }} />
                        ))}

                        {/* Targets */}
                        {vsTargets.map(t => !t.found && (
                            <div
                                key={t.id}
                                onMouseDown={() => handleFindTarget(t.id)}
                                className="absolute w-5 h-5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] cursor-crosshair z-10 hover:scale-150 transition-transform"
                                style={{ left: `${t.x}%`, top: `${t.y}%` }}
                            />
                        ))}
                    </div>
                )}

                {/* ============================================== */}
                {/* STAGE 3: PROCEDURAL */}
                {/* ============================================== */}
                {stage === "procedural" && (
                    <div className="absolute inset-0 p-8 flex flex-col items-center justify-center animate-in slide-in-from-right-16 duration-300 pt-20">
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-lg font-black text-slate-900 bg-white px-6 py-3 rounded-2xl shadow-xl border-4 border-purple-500 z-50 text-center uppercase tracking-wide w-4/5">CEL: Układaj z taśmy na paletę. <span className="text-emerald-500 bg-emerald-100 px-1 rounded">ZIELONE</span> TO ODRZUT. Oczekuj awarii.</div>

                        {/* Main Pallet (3x3) */}
                        <div className="grid grid-cols-3 gap-2 p-4 bg-slate-200 dark:bg-slate-800 rounded-xl mb-12">
                            {prPallet.map((slot, i) => (
                                <div key={i} className="w-16 h-16 border-2 border-dashed border-slate-400 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                                    {slot && <div className={clsx("w-12 h-12 rounded-md shadow-inner", slot === "red" ? "bg-red-500" : slot === "blue" ? "bg-blue-500" : "bg-emerald-500")} />}
                                </div>
                            ))}
                        </div>

                        {/* Conveyor Belt / Queue */}
                        <div className="w-full h-24 bg-slate-800 rounded-2xl flex items-center px-4 gap-4 overflow-hidden relative">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)' }} />
                            <div className="w-24 text-center font-bold text-white z-10 shrink-0 border-r border-slate-600 pr-4">TAŚMA &rarr;</div>
                            <div className="flex gap-2 z-10 flex-1 overflow-hidden">
                                <AnimatePresence>
                                    {prQueue.map((item, i) => (
                                        <motion.div
                                            key={`${i}-${item}`}
                                            initial={{ x: 50, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            exit={{ scale: 0 }}
                                            className="shrink-0"
                                        >
                                            {i === 0 ? (
                                                <div className="flex flex-col gap-2 -mt-8">
                                                    <div className={clsx("w-14 h-14 rounded-md border-4 border-white shadow-lg", item === "red" ? "bg-red-500" : item === "blue" ? "bg-blue-500" : "bg-emerald-500")} />
                                                    <div className="flex gap-1">
                                                        <button onClick={() => attemptPlaceOnPallet(item)} className="bg-blue-500 text-white text-xs py-1 px-2 rounded font-bold">Paleta</button>
                                                        <button onClick={attemptReject} className="bg-red-500 text-white text-xs py-1 px-2 rounded font-bold">Kosz</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={clsx("w-14 h-14 rounded-md opacity-50", item === "red" ? "bg-red-500" : item === "blue" ? "bg-blue-500" : "bg-emerald-500")} />
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================== */}
                {/* FINISHED */}
                {/* ============================================== */}
                {stage === "finished" && (
                    <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 z-50">
                        <h2 className="text-3xl font-bold mb-2">Analiza Zakończona</h2>
                        <p className="text-slate-500 mb-8">System przetworzył odruchy z trzech modułów zadaniowych.</p>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-xl mb-8">
                            <div className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-2">Weryfikacja Modułu 5S</div>
                            <div className={clsx("text-2xl font-bold mb-2", evaluateProfile().color)}>
                                {evaluateProfile().title}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-4 text-left border-l-2 border-slate-200 pl-3">
                                {evaluateProfile().desc}
                            </p>
                        </div>

                        <button
                            onClick={startTest}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        >
                            <RotateCcw size={18} />
                            Wykonaj ponownie (dla testów)
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
