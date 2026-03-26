"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, Target, Play, RotateCcw } from "lucide-react";
import clsx from "clsx";

type TargetItem = {
    id: string;
    x: number;
    y: number;
    isGood: boolean;
    spawnTime: number;
};

type GameState = "idle" | "playing" | "finished";

export default function AgilityGame() {
    const [gameState, setGameState] = useState<GameState>("idle");
    const [timeLeft, setTimeLeft] = useState(40);
    const [score, setScore] = useState(0);
    const [clicks, setClicks] = useState({ total: 0, correct: 0, wrong: 0, missedGood: 0 });
    const [targets, setTargets] = useState<TargetItem[]>([]);
    const [messages, setMessages] = useState<{ id: number; text: string; type: "warning" | "info" }[]>([]);
    const playAreaRef = useRef<HTMLDivElement>(null);
    const gameLoopRef = useRef<NodeJS.Timeout>(null);

    // Rule change mechanic
    const [ignoreGood, setIgnoreGood] = useState(false);

    const startGame = () => {
        setGameState("playing");
        setTimeLeft(40);
        setScore(0);
        setClicks({ total: 0, correct: 0, wrong: 0, missedGood: 0 });
        setTargets([]);
        setMessages([]);
        setIgnoreGood(false);
    };

    useEffect(() => {
        if (gameState !== "playing") return;

        // Timer
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setGameState("finished");
                    return 0;
                }

                // At 20 seconds, trigger a disruptive emergency rule to test "Spryt/Myślenie" (Reading instructions under pressure)
                if (prev === 21) {
                    setIgnoreGood(true);
                    setMessages(m => [...m, { id: Date.now(), text: "UWAGA ZMIANA! NIE KLIKAJ ZIELONYCH KÓŁEK PRZEZ 5 SEKUND!", type: "warning" }]);
                    setTimeout(() => {
                        setIgnoreGood(false);
                        setMessages(m => [...m, { id: Date.now(), text: "ZAGROŻENIE MINĘŁO. WRACAMY DO NORMALNEJ PRACY.", type: "info" }]);
                    }, 5000);
                }

                return prev - 1;
            });
        }, 1000);

        // Spawner
        gameLoopRef.current = setInterval(() => {
            if (!playAreaRef.current) return;
            const rect = playAreaRef.current.getBoundingClientRect();
            const padding = 60;
            const x = Math.random() * (rect.width - padding * 2) + padding;
            const y = Math.random() * (rect.height - padding * 2) + padding;
            const isGood = Math.random() < 0.7; // 70% good parts

            const newTarget: TargetItem = {
                id: Math.random().toString(36).substr(2, 9),
                x,
                y,
                isGood,
                spawnTime: Date.now(),
            };

            setTargets((prev) => [...prev, newTarget]);

            // Auto-remove target after 1.5s
            setTimeout(() => {
                setTargets((current) => {
                    const targetStillExists = current.find(t => t.id === newTarget.id);
                    if (targetStillExists && targetStillExists.isGood && !ignoreGood) {
                        // Missed a good part
                        setClicks(c => ({ ...c, missedGood: c.missedGood + 1 }));
                    }
                    return current.filter((t) => t.id !== newTarget.id);
                });
            }, 1500 + Math.random() * 500);

        }, 700); // Fast spawn rate (every 0.7s) to simulate line pace

        return () => {
            clearInterval(timer);
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [gameState, ignoreGood]);

    const handleTargetClick = (target: TargetItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (gameState !== "playing") return;

        setTargets((prev) => prev.filter((t) => t.id !== target.id));
        setClicks((prev) => ({ ...prev, total: prev.total + 1 }));

        if (ignoreGood) {
            // If the emergency rule is active, touching ANYTHING is bad (except maybe they should just wait)
            setScore((s) => s - 20);
            setClicks((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
            return;
        }

        if (target.isGood) {
            setScore((s) => s + 10);
            setClicks((prev) => ({ ...prev, correct: prev.correct + 1 }));
        } else {
            setScore((s) => s - 15);
            setClicks((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
        }
    };

    const handleEmptyClick = () => {
        if (gameState !== "playing") return;
        setClicks((prev) => ({ ...prev, total: prev.total + 1 }));
        setScore((s) => s - 5); // Penalty for reckless clicking
    };

    // Profiler logic
    const accuracy = clicks.total > 0 ? Math.round((clicks.correct / clicks.total) * 100) : 0;
    const generateProfile = () => {
        if (accuracy > 90 && clicks.total > 35 && clicks.wrong === 0) return { title: "DOKŁADNY i SZYBKI", color: "text-emerald-500", desc: "Znakomity refleks, zero pomyłek." };
        if (accuracy > 90) return { title: "DOKŁADNY (ostrożny)", color: "text-blue-500", desc: "Woli pracować wolniej, ale bez błędów. Dobry na kontrolę jakości." };
        if (accuracy < 80 && clicks.total > 40) return { title: "POSPIESZNY (ryzyko błędów)", color: "text-amber-500", desc: "Szybkie tempo okupił błędami wizualnymi. Trzeba zwracać mu uwagę na detale." };
        return { title: "ZRÓWNOWAŻONY", color: "text-indigo-500", desc: "Standardowe tempo i proporcja błędów." };
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Clock className={timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-slate-500"} size={20} />
                        <span className={clsx("font-mono text-2xl font-bold", timeLeft <= 10 && "text-red-500")}>
                            00:{timeLeft.toString().padStart(2, "0")}
                        </span>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
                    <div className="flex items-center gap-2">
                        <Target className="text-blue-500" size={20} />
                        <span className="font-mono text-2xl font-bold">{score} pkt</span>
                    </div>
                </div>

                {gameState === "playing" && (
                    <div className="flex gap-4 text-sm font-medium text-slate-500">
                        <span>Trafienia: <span className="text-emerald-500">{clicks.correct}</span></span>
                        <span>Błędy: <span className="text-red-500">{clicks.wrong}</span></span>
                    </div>
                )}
            </div>

            {messages.length > 0 && (
                <div className="space-y-2">
                    <AnimatePresence>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={clsx(
                                    "p-4 rounded-xl font-bold flex items-center gap-3",
                                    msg.type === "warning" ? "bg-red-500/10 text-red-600 border border-red-500/20" : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                )}
                            >
                                <AlertTriangle size={20} className={msg.type === "warning" ? "animate-pulse" : ""} />
                                {msg.text}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <div
                ref={playAreaRef}
                onMouseDown={handleEmptyClick}
                className={clsx(
                    "relative w-full h-[500px] border-2 border-dashed rounded-3xl overflow-hidden touch-none select-none transition-colors",
                    gameState === "playing" ? "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 cursor-crosshair" : "border-transparent bg-slate-100 dark:bg-slate-900 flex items-center justify-center",
                    ignoreGood && "border-red-500/50 bg-red-500/5"
                )}
            >
                {gameState === "idle" && (
                    <div className="text-center p-8 max-w-md">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Play size={32} className="ml-1" />
                        </div>
                        <h3 className="text-xl font-bold mb-4">Instrukcja Stanowiskowa</h3>
                        <p className="text-slate-500 mb-6 text-sm">
                            Na ekranie będą pojawiać się detale. <strong>ZIELONE KOŁA</strong> to detale poprawne - klikaj w nie jak najszybciej.
                            <strong>CZERWONE KWADRATY</strong> to braki - ignoruj je. Utrzymaj uwagę przez 40 sekund.<br /><br />Pamiętaj: reaguj na komunikaty awaryjne!
                        </p>
                        <button
                            onClick={startGame}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-blue-500/25"
                        >
                            Rozumiem, startujemy
                        </button>
                    </div>
                )}

                {gameState === "playing" && targets.map((target) => (
                    <motion.div
                        key={target.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        onMouseDown={(e: any) => handleTargetClick(target, e)}
                        className={clsx(
                            "absolute w-12 h-12 flex items-center justify-center cursor-pointer shadow-lg active:scale-90 transition-transform",
                            target.isGood ? "bg-emerald-500 rounded-full shadow-emerald-500/30" : "bg-red-500 rounded-lg shadow-red-500/30"
                        )}
                        style={{
                            left: target.x - 24,
                            top: target.y - 24
                        }}
                    />
                ))}

                {gameState === "finished" && (
                    <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                        <h2 className="text-3xl font-bold mb-2">Czas minął!</h2>
                        <p className="text-slate-500 mb-8">Twoje wyniki zostały zapisane w profilu.</p>

                        <div className="grid grid-cols-2 gap-4 max-w-sm w-full mb-8">
                            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl">
                                <div className="text-sm text-slate-500 mb-1">Skuteczność</div>
                                <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{accuracy}%</div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl">
                                <div className="text-sm text-slate-500 mb-1">Pomyłki (Braki)</div>
                                <div className="text-3xl font-bold text-red-500">{clicks.wrong}</div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-xl mb-8">
                            <div className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-2">Wstępny Profil</div>
                            <div className={clsx("text-2xl font-bold mb-2", generateProfile().color)}>
                                {generateProfile().title}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">
                                {generateProfile().desc}
                            </p>
                        </div>

                        <button
                            onClick={startGame}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        >
                            <RotateCcw size={18} />
                            Spróbuj ponownie
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
