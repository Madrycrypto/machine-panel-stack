"use client";

import { useState, useEffect } from "react";
import { BrainCircuit, Clock, ChevronRight, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import clsx from "clsx";
import { useHRDatabase } from "@/context/HRContext";

// Types
type Puzzle = {
    id: string;
    instruction: string;
    grid: (React.ReactNode | null)[]; // 9 items for 3x3 grid, last is null
    options: { id: string; content: React.ReactNode; isCorrect: boolean }[];
};

// ... (Rest of logic unchanged until the component function)

// --- PUZZLE DEFINITIONS ---
// We use simple CSS shapes to represent logical matrices.

const Circle = ({ n, color = "bg-slate-800 dark:bg-slate-200" }: { n: number, color?: string }) => (
    <div className="flex flex-wrap items-center justify-center gap-1 w-full h-full p-2">
        {Array.from({ length: n }).map((_, i) => <div key={i} className={clsx("w-3 h-3 rounded-full", color)} />)}
    </div>
);

const Shape = ({ type, color }: { type: "square" | "circle" | "triangle", color: string }) => {
    if (type === "square") return <div className={clsx("w-6 h-6", color)} />;
    if (type === "circle") return <div className={clsx("w-6 h-6 rounded-full", color)} />;
    if (type === "triangle") return <div className={clsx("w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px]", color.replace("bg-", "border-b-"))} />;
    return null;
};

const PUZZLES: Puzzle[] = [
    {
        id: "p1",
        instruction: "Znajdź zależność w rzędach i wskaż brakujący element.",
        // Logic: Addition of dots in a row (R1: 1+2=3, R2: 2+1=3, R3: 1+3=4)
        grid: [
            <Circle n={1} />, <Circle n={2} />, <Circle n={3} />,
            <Circle n={2} />, <Circle n={1} />, <Circle n={3} />,
            <Circle n={1} />, <Circle n={3} />, null
        ],
        options: [
            { id: "o1", content: <Circle n={2} />, isCorrect: false },
            { id: "o2", content: <Circle n={3} />, isCorrect: false },
            { id: "o3", content: <Circle n={4} />, isCorrect: true },
            { id: "o4", content: <Circle n={5} />, isCorrect: false },
        ]
    },
    {
        id: "p2",
        instruction: "Dopasuj brakujący element bazując na wzorze logicznym.",
        // Logic: Color and shape shift right. 
        // Row 1: Sq(Red), Circ(Blue), Tri(Green)
        // Row 2: Circ(Blue), Tri(Green), Sq(Red)
        // Row 3: Tri(Green), Sq(Red), ? -> Circ(Blue)
        grid: [
            <Shape type="square" color="bg-red-500" />, <Shape type="circle" color="bg-blue-500" />, <Shape type="triangle" color="bg-emerald-500" />,
            <Shape type="circle" color="bg-blue-500" />, <Shape type="triangle" color="bg-emerald-500" />, <Shape type="square" color="bg-red-500" />,
            <Shape type="triangle" color="bg-emerald-500" />, <Shape type="square" color="bg-red-500" />, null
        ],
        options: [
            { id: "o1", content: <Shape type="circle" color="bg-emerald-500" />, isCorrect: false },
            { id: "o2", content: <Shape type="triangle" color="bg-blue-500" />, isCorrect: false },
            { id: "o3", content: <Shape type="circle" color="bg-blue-500" />, isCorrect: true },
            { id: "o4", content: <Shape type="square" color="bg-red-500" />, isCorrect: false },
        ]
    },
    {
        id: "p3",
        instruction: "Złożona macierz: Jaka figura powinna znaleźć się na końcu?",
        // Logic: Outer shape stays same in column. Inner shape dictates outer shape of next row.
        // Simplifying to rotation/direction logic for MVP:
        // Row 1: 👉, 👇, 👈
        // Row 2: 👇, 👈, 👆
        // Row 3: 👈, 👆, ? -> 👉 (Rotation by 90deg clockwise per step)
        grid: [
            <div className="text-2xl">👉</div>, <div className="text-2xl">👇</div>, <div className="text-2xl">👈</div>,
            <div className="text-2xl">👇</div>, <div className="text-2xl">👈</div>, <div className="text-2xl">👆</div>,
            <div className="text-2xl">👈</div>, <div className="text-2xl">👆</div>, null
        ],
        options: [
            { id: "o1", content: <div className="text-2xl">👇</div>, isCorrect: false },
            { id: "o2", content: <div className="text-2xl">👉</div>, isCorrect: true },
            { id: "o3", content: <div className="text-2xl">👈</div>, isCorrect: false },
            { id: "o4", content: <div className="text-2xl">👆</div>, isCorrect: false },
        ]
    }
];

const TIME_PER_PUZZLE = 20;

export default function FluidIntelligenceTest({ onComplete }: { onComplete?: () => void }) {
    const { updateCandidateScore } = useHRDatabase();
    const [currentPuzzle, setCurrentPuzzle] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TIME_PER_PUZZLE);
    const [answers, setAnswers] = useState<{ puzzleId: string; optionId: string | null; timeTaken: number }[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [savedToDB, setSavedToDB] = useState(false);
    const [showHRView, setShowHRView] = useState(false);

    useEffect(() => {
        if (!hasStarted || isFinished) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleNext(null); // Time out = missed question
                    return TIME_PER_PUZZLE;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [currentPuzzle, isFinished, hasStarted]);

    const handleNext = (optionId: string | null) => {
        setAnswers(prev => [
            ...prev,
            {
                puzzleId: PUZZLES[currentPuzzle].id,
                optionId,
                timeTaken: TIME_PER_PUZZLE - timeLeft
            }
        ]);

        if (currentPuzzle < PUZZLES.length - 1) {
            setCurrentPuzzle(prev => prev + 1);
            setTimeLeft(TIME_PER_PUZZLE);
        } else {
            setIsFinished(true);
        }
    };

    const evaluateScore = () => {
        let correct = 0;
        let totalTime = 0;

        const details = answers.map(ans => {
            const puzzle = PUZZLES.find(p => p.id === ans.puzzleId)!;
            const chosenOption = puzzle.options.find(o => o.id === ans.optionId);
            const correctOption = puzzle.options.find(o => o.isCorrect)!;
            const isCorrect = chosenOption?.isCorrect || false;

            if (isCorrect) correct++;
            totalTime += ans.timeTaken;

            return { puzzle, ans, chosenOption, correctOption, isCorrect };
        });

        const isHighIQ = correct === PUZZLES.length;
        const isMedium = correct > 0 && correct < PUZZLES.length;
        // Fast processing speed if average time < 8s per puzzle
        const isFast = totalTime / PUZZLES.length < 8;

        return { correct, totalTime, isHighIQ, isMedium, isFast, details };
    };

    if (isFinished && !savedToDB) {
        const { correct, totalTime, isHighIQ, isFast } = evaluateScore();
        updateCandidateScore("#78291", "wcFluidIQ", { correct, totalTime, isHighIQ, isFast });
        setSavedToDB(true);
    }

    if (!hasStarted) {
        return (
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-lg max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <BrainCircuit size={32} />
                </div>
                <h3 className="text-xl font-bold mb-4">Test Płynnej Inteligencji (Gf)</h3>
                <p className="text-slate-500 mb-6 text-sm">
                    Czeka Cię seria zagadek matrycowych badających tzw. Inteligencję Płynną – zdolność abstrakcyjnego myślenia i odnajdywania zależności. Stanowi to fundament do pracy analitycznej i technicznej.
                </p>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-left text-sm text-slate-600 dark:text-slate-400 mb-8 border border-slate-100 dark:border-slate-700">
                    <ul className="list-disc pl-5 space-y-1">
                        <li>3 zagadki logiczne.</li>
                        <li>Szybko analizuj rzędy i kolumny.</li>
                        <li><strong>20 sekund</strong> na każdą z nich.</li>
                    </ul>
                </div>
                <button
                    onClick={() => setHasStarted(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-blue-500/25"
                >
                    Rozpocznij Test
                </button>
            </div>
        );
    }

    if (isFinished) {
        const { correct, isHighIQ, isFast, totalTime, details } = evaluateScore();
        return (
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-lg max-w-2xl mx-auto">

                {/* CANDIDATE VIEW */}
                <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Dziękujemy za udział w badaniu</h3>
                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Twoje odpowiedzi zostały w bezpieczny sposób przetworzone i zaczytane do platformy rekrutacyjnej.</p>

                    {onComplete && (
                        <button
                            onClick={onComplete}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-8 py-3 rounded-xl font-medium transition-colors mb-8 text-sm inline-flex items-center gap-2"
                        >
                            Logowanie sesji (Zakończ)
                        </button>
                    )}
                </div>

                {/* SECRET HR TOGGLE */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-8 mt-4">
                    <div className="flex justify-center">
                        <button
                            onClick={() => setShowHRView(!showHRView)}
                            className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            <ShieldAlert size={16} />
                            {showHRView ? "Ukryj Panel Rekrutera" : "Pokaż Autoryzowany Panel Rekrutera (HR)"}
                        </button>
                    </div>

                    {/* HR VIEW CONTENT */}
                    {showHRView && (
                        <div className="mt-8 animate-in fade-in slide-in-from-top-4 space-y-6">
                            <h4 className="font-bold text-lg text-indigo-500 flex items-center gap-2">
                                <BrainCircuit size={20} />
                                Raport Psychometryczny: Zdolności Analityczne (Gf)
                            </h4>

                            <div className="flex gap-4">
                                <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                                    <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Poprawność</div>
                                    <div className={clsx("text-2xl font-bold", isHighIQ ? "text-emerald-500" : "text-amber-500")}>
                                        {correct} / {PUZZLES.length}
                                    </div>
                                </div>
                                <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                                    <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Śr. Czas Decyzji</div>
                                    <div className={clsx("text-2xl font-bold", isFast ? "text-emerald-500" : "text-slate-700 dark:text-slate-300")}>
                                        {(totalTime / PUZZLES.length).toFixed(1)}s
                                    </div>
                                </div>
                            </div>

                            <div className="text-left bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-5 rounded-xl">
                                <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Wniosek rekrutacyjny:</h4>
                                <p className="text-blue-700 dark:text-blue-400 text-sm">
                                    {isHighIQ
                                        ? "Kandydat posiada wybitne zdolności analityczne. Doskonale radzi sobie z odnajdywaniem struktur w nieznanych danych. Idealny profil dla inżynierii procesu i skomplikowanych problemów analitycznych."
                                        : "Kandydat wykazuje przecietne zdolności w odnajdywaniu zależności abstrakcyjnych. Praca na stanowisku ściśle analitycznym (np. statystyka R&D) może sprawiać mu wyzwanie, jednak sprawdzi się w procesach o zdefiniowanych regułach."
                                    }
                                </p>
                                {isFast && isHighIQ && (
                                    <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-2 font-semibold">
                                        + Dodatkowo: Ekstremalnie wysoka szybkość procesowania (Rapid Cognition).
                                    </p>
                                )}
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h5 className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-2">Szczegóły Wyborów:</h5>
                                {details.map((d, i) => (
                                    <div key={i} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                                        <div className="flex flex-col text-center sm:text-left">
                                            <span className="text-xs font-bold text-slate-400 mb-1">Pytanie {i + 1}</span>
                                            <span className="text-sm font-medium mb-1">{d.puzzle.instruction}</span>
                                            <span className="text-xs text-slate-500">Czas odp.: {d.ans.timeTaken}s</span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 rounded-lg">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] uppercase text-slate-400 font-bold mb-1">Kandydat</span>
                                                <div className="w-12 h-12 border border-slate-200 dark:border-slate-700 flex items-center justify-center rounded-md bg-white dark:bg-slate-950 scale-75 overflow-hidden">
                                                    {d.chosenOption ? d.chosenOption.content : <span className="text-red-500 text-xs font-bold">BRAK</span>}
                                                </div>
                                            </div>

                                            {d.isCorrect ? (
                                                <CheckCircle2 className="text-emerald-500" size={24} />
                                            ) : (
                                                <>
                                                    <XCircle className="text-red-500" size={24} />
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] uppercase text-emerald-500 font-bold mb-1">Poprawne</span>
                                                        <div className="w-12 h-12 border border-slate-200 dark:border-slate-700 flex items-center justify-center rounded-md bg-white dark:bg-slate-950 scale-75 overflow-hidden">
                                                            {d.correctOption.content}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const puzzle = PUZZLES[currentPuzzle];

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Header bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all h-20 relative overflow-hidden">
                <div className={clsx(
                    "absolute inset-0 z-0 bg-red-500/5 transition-opacity duration-300",
                    timeLeft <= 5 ? "opacity-100 animate-pulse" : "opacity-0"
                )} />
                <div className="flex items-center gap-6 w-full z-10">
                    <div className="flex items-center gap-2">
                        <Clock className={timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-slate-500"} size={20} />
                        <span className={clsx("font-mono text-xl font-bold transition-colors w-8", timeLeft <= 5 ? "text-red-500" : "text-slate-700 dark:text-slate-200")}>
                            00:{timeLeft.toString().padStart(2, "0")}
                        </span>
                    </div>

                    {/* Progress Bar acts as a timer bar now */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex-1">
                        <div
                            className={clsx("h-full transition-all duration-1000 linear", timeLeft <= 5 ? "bg-red-500" : "bg-blue-500")}
                            style={{ width: `${(timeLeft / TIME_PER_PUZZLE) * 100}%` }}
                        />
                    </div>
                    <div className="text-sm font-bold text-slate-500 w-12 text-right">
                        {currentPuzzle + 1} / {PUZZLES.length}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm text-center">
                <h3 className="text-xl font-semibold mb-8">{puzzle.instruction}</h3>

                <div className="flex flex-col md:flex-row gap-12 items-center justify-center">

                    {/* MATRICE GRID */}
                    <div className="grid grid-cols-3 grid-rows-3 gap-2 p-4 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                        {puzzle.grid.map((item, idx) => (
                            <div key={idx} className={clsx(
                                "w-16 h-16 sm:w-20 sm:h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center shadow-sm relative",
                                idx === 8 && "border-2 border-dashed border-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                            )}>
                                {idx === 8 && !item ? <span className="text-2xl font-bold text-blue-500">?</span> : item}
                            </div>
                        ))}
                    </div>

                    <div className="text-slate-300 dark:text-slate-700 font-bold hidden md:block">
                        ===&gt;
                    </div>

                    {/* OPTIONS */}
                    <div className="grid grid-cols-2 gap-4">
                        {puzzle.options.map(option => (
                            <button
                                key={option.id}
                                onClick={() => handleNext(option.id)}
                                className="w-20 h-20 sm:w-24 sm:h-24 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center hover:border-blue-500 hover:shadow-lg transition-all active:scale-95 group"
                            >
                                <div className="group-hover:scale-110 transition-transform">
                                    {option.content}
                                </div>
                            </button>
                        ))}
                    </div>

                </div>
            </div>

        </div>
    );
}
