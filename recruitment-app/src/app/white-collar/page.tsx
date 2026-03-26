"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, BrainCircuit, ListTodo, Users, Target, Activity } from "lucide-react";
import clsx from "clsx";
import FluidIntelligenceTest from "@/components/white-collar/FluidIntelligenceTest";

const CLUSTERS = [
    {
        id: "engineering",
        name: "Inżynieria i Technologia",
        roles: "Inżynier Procesu, Inżynier Jakości, Technik UR, Inżynier UR",
        icon: <Activity className="text-blue-500" size={24} />,
        color: "bg-blue-50 border-blue-200 hover:border-blue-400 dark:bg-blue-900/10 dark:border-blue-800 dark:hover:border-blue-500"
    },
    {
        id: "management",
        name: "Zarządzanie i Liderstwo",
        roles: "Kierownik (Jakość, Produkcja, Projekt, Zakupy, Magazyn, Kadry), Lider Zespołu",
        icon: <Users className="text-purple-500" size={24} />,
        color: "bg-purple-50 border-purple-200 hover:border-purple-400 dark:bg-purple-900/10 dark:border-purple-800 dark:hover:border-purple-500"
    },
    {
        id: "operations",
        name: "Operacje i Łańcuch Dostaw",
        roles: "Planista, Logistyk, Zakupowiec, Lider Magazynu",
        icon: <Target className="text-emerald-500" size={24} />,
        color: "bg-emerald-50 border-emerald-200 hover:border-emerald-400 dark:bg-emerald-900/10 dark:border-emerald-800 dark:hover:border-emerald-500"
    },
    {
        id: "finance",
        name: "Administracja i Finanse",
        roles: "Księgowy, Asystent Księgowości, Kadrowa",
        icon: <ListTodo className="text-orange-500" size={24} />,
        color: "bg-orange-50 border-orange-200 hover:border-orange-400 dark:bg-orange-900/10 dark:border-orange-800 dark:hover:border-orange-500"
    }
];

export default function WhiteCollarHub() {
    const [activeTest, setActiveTest] = useState<"hub" | "fluidIQ" | "inBasket">("hub");

    // If a test is active, render it directly instead of the hub
    if (activeTest === "fluidIQ") {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 py-12">
                <div className="max-w-4xl mx-auto mb-6 px-4">
                    <button
                        onClick={() => setActiveTest("hub")}
                        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-semibold transition-colors"
                    >
                        &larr; Przerwij i wróć do Hubu
                    </button>
                </div>
                <FluidIntelligenceTest onComplete={() => setActiveTest("hub")} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 pb-24">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                <header className="max-w-6xl mx-auto p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                            <Briefcase size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-tight">Zarządzanie Personelem Biurowym</h1>
                            <p className="text-xs text-slate-500 font-medium">Moduł: White Collar Assessment</p>
                        </div>
                    </div>
                    <Link href="/">
                        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors">
                            Wróć do Panelu Głównego
                        </div>
                    </Link>
                </header>
            </div>

            <main className="max-w-5xl mx-auto p-6 mt-8 space-y-12">

                {/* Intro Section */}
                <section className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold mb-4">Wielowymiarowy Profiler Kompetencji</h2>
                    <p className="text-slate-500 text-lg">
                        Platforma bada kandydatów dwutorowo. Najpierw przechodzą wspólny test płynnej inteligencji (logiki), a następnie rozwiązują scenki problemowe dedykowane specyfice ich stanowiska.
                    </p>
                </section>

                {/* Global Tests (Base) */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold">1</div>
                        <h3 className="text-2xl font-bold">Wspólne Gry Psychometryczne (Baza)</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                                <BrainCircuit size={28} />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold mb-2">Płynna Inteligencja (Gf)</h4>
                                <p className="text-slate-500 text-sm">
                                    Abstrakcyjne matryce logiczne. Bada zdolność kandydata do odnajdywania zależności i rozwiązywania niespotykanych dotąd problemów (Myślenie "Out of the box").
                                </p>
                            </div>
                            <button
                                onClick={() => setActiveTest("fluidIQ")}
                                className="mt-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm w-full transition-colors active:scale-95"
                            >
                                Uruchom Moduł Logiczny
                            </button>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
                                <ListTodo size={28} />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold mb-2">Priorytetyzacja (In-Basket)</h4>
                                <p className="text-slate-500 text-sm">
                                    Symulacja skrzynki pocztowej. Kandydat zostaje zalany celowo spreparowanymi wiadomościami pod presją czasu. Musi odróżnić zadania Pilne i Rzutujące na Koszty, od tzw. "Wrzutek".
                                </p>
                            </div>
                            <div className="mt-auto px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium rounded-lg text-sm border border-dashed border-slate-300 dark:border-slate-700 inline-block w-full text-center">Moduł w Projektowaniu</div>
                        </div>
                    </div>
                </section>

                <div className="h-px bg-slate-200 dark:bg-slate-800 w-full" />

                {/* Cluster Selection */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold">2</div>
                        <h3 className="text-2xl font-bold">Wybór Ścieżki Case-Study (Klastry)</h3>
                    </div>
                    <p className="text-slate-500 mb-8 max-w-3xl">Każdy specjalista przechodzi branżowe case-study oparte o wagi odpowiedzi. Wybierz klaster docelowy dla kandydata, aby uruchomić test ułożony specjalnie pod ten sektor.</p>

                    <div className="grid md:grid-cols-2 gap-4">
                        {CLUSTERS.map((cluster) => (
                            <Link key={cluster.id} href={`/white-collar/cluster/${cluster.id}`}>
                                <div className={clsx(
                                    "p-6 rounded-2xl border-2 transition-all cursor-pointer h-full flex items-start gap-4 group hover:shadow-lg",
                                    cluster.color
                                )}>
                                    <div className="bg-white dark:bg-slate-950 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 group-hover:scale-110 transition-transform flex-shrink-0">
                                        {cluster.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold mb-1 group-hover:underline underline-offset-4">{cluster.name}</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Obejmuje ramy kompetencyjne dla: <strong>{cluster.roles}</strong></p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

            </main>
        </div>
    );
}
