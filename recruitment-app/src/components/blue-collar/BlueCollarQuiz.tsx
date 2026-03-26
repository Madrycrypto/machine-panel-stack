"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, ChevronRight, AlertCircle, ShieldAlert, Clock } from "lucide-react";
import clsx from "clsx";

const TIME_PER_QUESTION = 25; // Zwiększony na prośbę: 25 sek. by skompensować stres uczytania kandydata

const QUESTIONS = [
    {
        id: "q1",
        title: "Stosunek do Procedur",
        text: "Mamy w firmie bardzo długie i szczegółowe instrukcje stanowiskowe. Jakie jest Twoje podejście do nich z doświadczenia?",
        options: [
            { id: "a", text: "Zawsze czytam i wykonuję 100% kroków, nawet jeśli wydają się niepotrzebne.", score: { compliance: 5, availability: 0, lieScale: 5 } }, // Lie scale +5 (social desirability)
            { id: "b", text: "Zwykle połowa to czyste formalności, wyciągam z nich to, co naprawdę ważne dla jakości i tempa.", score: { compliance: -10, availability: 0, lieScale: 0 } },
            { id: "c", text: "To podstawa bezpieczeństwa i jakości, staram się ich trzymać, choć bywa to uciążliwe.", score: { compliance: 10, availability: 0, lieScale: 0 } }
        ]
    },
    {
        id: "q2",
        title: "Nadgodziny i Zmiany",
        text: "Jak zazwyczaj reagujesz, gdy na godzinę przed końcem zmiany podjeżdża niezapowiedziana partia priorytetowego materiału od klienta?",
        options: [
            { id: "a", text: "Zawsze cieszę się z dodatkowej pracy i z entuzjazmem zostaję po godzinach.", score: { compliance: 0, availability: 0, lieScale: 10 } }, // Too perfect
            { id: "b", text: "Psuje mi to plany na popołudnie, ale zostaję, żeby dokończyć, bo wymaga tego sytuacja.", score: { compliance: 0, availability: 15, lieScale: 0 } },
            { id: "c", text: "Robię ile zdążę do końca mojej zmiany i resztę przekazuję następnej zmianie.", score: { compliance: 0, availability: -5, lieScale: 0 } },
            { id: "d", text: "Frustruje mnie to i zdecydowanie odmawiam zostania dłużej, chyba że zapłacą podwójnie.", score: { compliance: -5, availability: -15, lieScale: 0 } }
        ]
    },
    {
        id: "q3",
        title: "Błędy na Linii",
        text: "Czy kiedykolwiek zdarzyło Ci się przeoczyć drobny błąd jakościowy, który pojechał dalej w proces, i nikomu o tym nie powiedziałeś?",
        options: [
            { id: "a", text: "Nigdy w życiu, moje detale są zawsze w 100% idealne.", score: { compliance: 0, availability: 0, lieScale: 15 } }, // Huge lie scale point
            { id: "b", text: "Tak, w natłoku pracy zdarzało się przeoczyć coś drobnego, jesteśmy tylko ludźmi.", score: { compliance: 5, availability: 0, lieScale: -5 } }, // Honest, realistic
            { id: "c", text: "Przeoczam tylko te błędy, o których wiem z doświadczenia, że nie uszkodzą końcowego produktu.", score: { compliance: -15, availability: 0, lieScale: 0 } } // Too risky rule bending
        ]
    },
    {
        id: "q4",
        title: "Monotonia",
        text: "Wielu bardzo doświadczonych pracowników automatycznie pomija jeden drobny krok z instrukcji, by przyspieszyć. Co o tym sądzisz?",
        options: [
            { id: "a", text: "Jeśli to wielokrotnie pozwalało osiągnąć normę bez reklamacji, to krok jest po prostu zbędny.", score: { compliance: -10, availability: 0, lieScale: 0 } },
            { id: "b", text: "Rozumiem ich frustrację z powodu monotonii, ale to niebezpieczne wyrabiać sobie takie nawyki.", score: { compliance: 10, availability: 0, lieScale: 0 } },
            { id: "c", text: "Dla mnie to nie do pomyślenia! Każdy taki pracownik powinien od razu dostać naganę.", score: { compliance: 0, availability: 0, lieScale: 5 } }
        ]
    },
    {
        id: "q5",
        title: "Przestoje",
        text: "Maszyna na Twoim stanowisku awarię. Czeka na utrzymanie ruchu od 40 minut. Co robisz?",
        options: [
            { id: "a", text: "Czekam. Zgłosiłem problem liderowi, to już nie moja rola.", score: { compliance: 0, availability: -10, lieScale: 0 } },
            { id: "b", text: "Pytam lidera, czy mogę pomóc na innym stanowisku w oczekiwaniu na mechanika.", score: { compliance: 0, availability: 15, lieScale: 0 } },
            { id: "c", text: "Przez cały ten czas samodzielnie próbuję rozkręcić ramię robota, mimo że jestem tylko operatorem.", score: { compliance: -15, availability: 5, lieScale: 0 } } // Dangerous compliance violation
        ]
    }
];

export default function BlueCollarQuiz() {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isFinished, setIsFinished] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);

    useEffect(() => {
        if (!hasStarted || isFinished) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    // Time's up! Force next question.
                    handleNext();
                    return TIME_PER_QUESTION;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [currentQuestion, isFinished, hasStarted]);

    const handleSelect = (optionId: string) => {
        setAnswers((prev) => ({ ...prev, [QUESTIONS[currentQuestion].id]: optionId }));
        // Wait briefly then move to next to preserve pace, OR let them use remaining time to change?
        // Let's auto-proceed after 300ms to keep the pressure high.
        setTimeout(() => {
            handleNext();
        }, 300);
    };

    const handleNext = () => {
        if (currentQuestion < QUESTIONS.length - 1) {
            setCurrentQuestion((prev) => prev + 1);
            setTimeLeft(TIME_PER_QUESTION);
        } else {
            setIsFinished(true);
        }
    };

    const calculateProfile = () => {
        let compliance = 0;
        let availability = 0;
        let lieScale = 0; // The higher the score, the more they are "faking good"
        let unanswered = 0;

        QUESTIONS.forEach((q) => {
            const oId = answers[q.id];
            if (!oId) {
                unanswered++;
                return; // No score for missed questions
            }
            const o = q.options.find((x) => x.id === oId);
            if (o) {
                compliance += o.score.compliance;
                availability += o.score.availability;
                lieScale += o.score.lieScale;
            }
        });

        return { compliance, availability, lieScale, unanswered };
    };

    if (!hasStarted) {
        return (
            <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-lg">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">Ocena Behawioralna (Scenki)</h3>
                <p className="text-slate-500 mb-6">
                    Przed Tobą seria krótkich sytuacji z życia produkcyjnego. Masz dokładnie <strong>{TIME_PER_QUESTION} sekund</strong> na przeczytanie każdej z nich i wybranie odpowiedzi, która jest najbliższa Twojemu doświadczeniu. Zaufaj swojemu pierwszemu instynktowi.
                </p>
                <button
                    onClick={() => setHasStarted(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-md shadow-blue-500/25"
                >
                    Zaczynamy (Czas Start)
                </button>
            </div>
        );
    }

    if (isFinished) {
        const { compliance, availability, lieScale, unanswered } = calculateProfile();
        const isLying = lieScale >= 15; // Threshold for being too perfect

        return (
            <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-lg">
                <div className={clsx(
                    "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6",
                    isLying ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                )}>
                    {isLying ? <ShieldAlert size={32} /> : <CheckCircle2 size={32} />}
                </div>
                <h3 className="text-2xl font-bold mb-4">Wyniki Analizy Behawioralnej</h3>
                <p className="text-slate-500 mb-8">Wielowymiarowy model decyzyjny przetworzył logikę kandydata pod presją czasu.</p>

                {isLying && (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-left mb-6">
                        <h4 className="font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                            <ShieldAlert size={20} />
                            Wysoki Wskaźnik Nieszczerości (Wskaźnik Kłamstwa: {lieScale})
                        </h4>
                        <p className="text-red-600 dark:text-red-300 text-sm">
                            Odpowiedzi kandydata wydają się być nienaturalnie perfekcyjne i wyuczone ("faking good"). Istnieje wysokie prawdopodobieństwo, że kandydat odpowiadał tak, by na siłę zadowolić rekrutera.
                        </p>
                    </div>
                )}

                {unanswered > 2 && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 text-left mb-6">
                        <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                            <Clock size={20} />
                            Spowolniony Proces Decyzyjny
                        </h4>
                        <p className="text-amber-600 dark:text-amber-300 text-sm">
                            Kandydat nie zdążył odpowiedzieć na znaczacą część pytań ({unanswered}/{QUESTIONS.length}). Może to sugerować problemy z szybkim podejmowaniem decyzji operacyjnych (paraliż analityczny).
                        </p>
                    </div>
                )}

                {!isLying && (
                    <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Dyscyplina i Jakość</div>
                            <div className={clsx("text-xl font-bold", compliance >= 15 ? "text-emerald-500" : compliance >= 0 ? "text-blue-500" : "text-amber-500")}>
                                {compliance >= 15 ? "Wysoka" : compliance >= 0 ? "Przeciętna" : "Niska / Ryzyko"}
                            </div>
                            <p className="text-sm text-slate-500 mt-2">Naturalne przestrzeganie SOP bez skłonności do niebezpiecznych skrótów.</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Dyspozycyjność</div>
                            <div className={clsx("text-xl font-bold", availability >= 15 ? "text-emerald-500" : availability >= 0 ? "text-blue-500" : "text-red-500")}>
                                {availability >= 15 ? "Wysoka (Nadgodziny)" : availability >= 0 ? "Umiarkowana" : "Brak elastyczności"}
                            </div>
                            <p className="text-sm text-slate-500 mt-2">Oparta na realnych, a nie deklaratywnych, postawach względem przerw i awarii.</p>
                        </div>

                        <div className="col-span-2 mt-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 text-sm text-blue-800 dark:text-blue-300">
                            <strong>Autentyczność: W normie.</strong> Kandydat nie wykazał ponadprzeciętnych skłonności do "koloryzowania" pod klucz testu ani nie paraliżowała go presja czasu.
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const question = QUESTIONS[currentQuestion];
    const hasAnsweredCurrent = !!answers[question.id];

    return (
        <div className="w-full max-w-4xl mx-auto flex gap-6">

            {/* Main Question Column */}
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-10 shadow-sm relative overflow-hidden">
                {/* Background Warning Flash when time is low */}
                <div className={clsx(
                    "absolute inset-0 z-0 bg-red-500/5 transition-opacity duration-300",
                    timeLeft <= 3 ? "opacity-100 animate-pulse" : "opacity-0"
                )} />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold rounded-xl flex items-center justify-center">
                                {currentQuestion + 1}
                            </div>
                            <span className="text-slate-500 font-medium">z {QUESTIONS.length}</span>
                        </div>

                        {/* Timer visual */}
                        <div className="flex items-center gap-2">
                            <Clock size={20} className={clsx(timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-slate-400")} />
                            <span className={clsx("font-mono text-xl font-bold transition-colors", timeLeft <= 3 ? "text-red-500" : "text-slate-700 dark:text-slate-200")}>
                                00:{timeLeft.toString().padStart(2, "0")}
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar acts as a timer bar now */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-8">
                        <div
                            className={clsx("h-full transition-all duration-1000 linear", timeLeft <= 3 ? "bg-red-500" : "bg-blue-500")}
                            style={{ width: `${(timeLeft / TIME_PER_QUESTION) * 100}%` }}
                        />
                    </div>

                    <div className="mb-8">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full mb-4">
                            <AlertCircle size={16} /> {question.title}
                        </div>
                        <h2 className="text-2xl font-semibold leading-relaxed">
                            {question.text}
                        </h2>
                    </div>

                    <div className="space-y-3 mb-8">
                        {question.options.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => handleSelect(option.id)}
                                className={clsx(
                                    "w-full text-left p-5 rounded-2xl border transition-all duration-200",
                                    answers[question.id] === option.id
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                                        : "border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                        answers[question.id] === option.id ? "border-blue-500 border-[6px]" : "border-slate-300 dark:border-slate-600"
                                    )} />
                                    <span className={clsx(
                                        "text-lg",
                                        answers[question.id] === option.id ? "text-slate-900 dark:text-white font-medium" : "text-slate-600 dark:text-slate-300"
                                    )}>
                                        {option.text}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Visual Stressor Column */}
            <div className="hidden md:flex flex-col w-32 shrink-0 bg-red-500/10 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-3xl overflow-hidden relative">
                <div className="absolute inset-0 bg-red-600 animate-[pulse_1s_ease-in-out_infinite] opacity-20 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen" />
                <div className="relative z-10 p-4 text-center mt-auto mb-auto h-full flex flex-col justify-center gap-4">
                    <ShieldAlert size={32} className="text-red-500 mx-auto animate-bounce" />
                    <div className="text-red-600 dark:text-red-400 font-bold uppercase tracking-widest text-xs transform -rotate-90 origin-center whitespace-nowrap opacity-50">
                        Czas Reakcji
                    </div>
                </div>
            </div>

        </div>
    );
}
