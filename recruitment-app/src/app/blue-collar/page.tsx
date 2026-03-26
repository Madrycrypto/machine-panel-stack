import Link from "next/link";
import AgilityGame from "@/components/blue-collar/AgilityGame";
import BlueCollarQuiz from "@/components/blue-collar/BlueCollarQuiz";
import FiveSAssessment from "@/components/blue-collar/FiveSAssessment";
import { HardHat } from "lucide-react";

export default function BlueCollarPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 pb-24">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                <header className="max-w-6xl mx-auto p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                            <HardHat size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-tight">Zarządzanie Personelem Fizycznym</h1>
                            <p className="text-xs text-slate-500 font-medium">KANDYDAT: #78291</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold text-slate-500 uppercase tracking-widest hidden sm:block">
                            Tryb Aktywny
                        </div>
                        <Link href="/">
                            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors">
                                Wróć do Panelu Głównego
                            </div>
                        </Link>
                    </div>
                </header>
            </div>

            <main className="max-w-6xl mx-auto p-6 space-y-16 mt-8">
                <section>
                    <div className="mb-6 flex flex-col items-center text-center max-w-2xl mx-auto">
                        <div className="w-12 h-12 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center text-lg font-bold mb-4 shadow-sm border border-blue-500/20">1</div>
                        <h2 className="text-2xl font-bold mb-2">
                            Test Zręcznościowy i Rytmu Pracy
                        </h2>
                        <p className="text-slate-500">Weryfikacja pod kątem koncentracji w powtarzalnym cyklu oraz dokładności.</p>
                    </div>
                    <AgilityGame />
                </section>

                <section className="pt-8 border-t border-slate-200 dark:border-slate-800">
                    <div className="mb-6 flex flex-col items-center text-center max-w-2xl mx-auto">
                        <div className="w-12 h-12 rounded-full bg-emerald-600/10 text-emerald-600 flex items-center justify-center text-lg font-bold mb-4 shadow-sm border border-emerald-500/20">2</div>
                        <h2 className="text-2xl font-bold mb-2">
                            Zintegrowane Badanie Instynktu 5S
                        </h2>
                        <p className="text-slate-500">Bardzo krótkie (30 sekund łącznie), dynamiczne zadania weryfikujące naturalne skłonności do rozwiązywania problemów produkcyjnych (Shadowboard, Visual Search, Procedury).</p>
                    </div>
                    <FiveSAssessment />
                </section>

                <section className="pt-8 border-t border-slate-200 dark:border-slate-800">
                    <div className="mb-6 flex flex-col items-center text-center max-w-2xl mx-auto">
                        <div className="w-12 h-12 rounded-full bg-purple-600/10 text-purple-600 flex items-center justify-center text-lg font-bold mb-4 shadow-sm border border-purple-500/20">3</div>
                        <h2 className="text-2xl font-bold mb-2">
                            Ocena Behawioralna (Scenki)
                        </h2>
                        <p className="text-slate-500">Weryfikacja autentycznej rzetelności, stosowania się do procedur i realnej dyspozycyjności.</p>
                    </div>
                    <BlueCollarQuiz />
                </section>
            </main>
        </div>
    );
}
