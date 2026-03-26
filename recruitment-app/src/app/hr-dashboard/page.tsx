"use client";

import { useHRDatabase } from "@/context/HRContext";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { ShieldAlert, CheckCircle2, Clock, Users, Activity, BrainCircuit } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

export default function HRDashboard() {
    const { candidates } = useHRDatabase();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 pb-24 font-sans">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                <header className="max-w-7xl mx-auto p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-tight">Master HR Dashboard</h1>
                            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Tylko dla autoryzowanego personelu</p>
                        </div>
                    </div>
                    <Link href="/">
                        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                            <span>Wróć do Systemu</span>
                        </div>
                    </Link>
                </header>
            </div>

            <main className="max-w-7xl mx-auto p-6 mt-8 space-y-8">

                {/* KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Users size={24} />
                        </div>
                        <div>
                            <div className="text-3xl font-black">{candidates.length}</div>
                            <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">Kandydatów Dziś</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <Activity size={24} />
                        </div>
                        <div>
                            <div className="text-3xl font-black">{candidates.filter(c => c.status === "W trakcie").length}</div>
                            <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">Aktywnych Sesji</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <div className="text-3xl font-black">{candidates.filter(c => c.status === "Zakończono").length}</div>
                            <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">Raportów Gotowych</div>
                        </div>
                    </div>
                </div>

                {/* Live Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-between items-center">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Clock size={20} className="text-blue-500" />
                            Bieżąca Aktywność Rekrutacyjna
                        </h2>
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full animate-pulse">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full" /> Na żywo
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 font-semibold">ID Kandydata</th>
                                    <th className="p-4 font-semibold">Profil / Klaster</th>
                                    <th className="p-4 font-semibold">Status Sesji</th>
                                    <th className="p-4 font-semibold">Wnioski (Agregacja)</th>
                                    <th className="p-4 font-semibold text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {candidates.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 font-mono font-bold">{c.id}</td>
                                        <td className="p-4 font-medium">
                                            <span className={clsx(
                                                "px-2 py-1 rounded-md text-xs border",
                                                c.type === "Blue Collar" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300"
                                                    : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800/50 dark:text-purple-300"
                                            )}>
                                                {c.type}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className={clsx(
                                                    "w-2 h-2 rounded-full",
                                                    c.status === "W trakcie" ? "bg-amber-500 animate-pulse" : c.status === "Zakończono" ? "bg-emerald-500" : "bg-slate-300"
                                                )} />
                                                <span className={clsx(
                                                    "font-semibold",
                                                    c.status === "Zakończono" && "text-emerald-600 dark:text-emerald-400"
                                                )}>
                                                    {c.status}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    ({formatDistanceToNow(new Date(c.startTime), { locale: pl, addSuffix: true })})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {c.status === "W trakcie" ? (
                                                <div className="text-slate-400 italic flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                                                    Analiza w toku...
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1 max-w-sm">
                                                    {/* Logic for Blue Collar display */}
                                                    {c.type === "Blue Collar" && c.bcQuiz && (
                                                        <>
                                                            {c.bcQuiz.isLying && <div className="text-xs font-bold text-red-600 bg-red-100 inline-block px-2 py-0.5 rounded border border-red-200">⚠️ WYSOKA WAGA KŁAMSTWA (Faking Good)</div>}
                                                            {c.bcQuiz.unanswered > 2 && <div className="text-xs font-bold text-amber-600 bg-amber-100 inline-block px-2 py-0.5 rounded border border-amber-200">⏱ PARALIŻ DECYZYJNY (Brak odp. na czas)</div>}
                                                            <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                                                                Zdolności manualne ({c.bcAgility?.accuracy || 0}% acc). 5S: {c.bcFiveS?.profile || "Brak danych"}.
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Logic for White Collar display */}
                                                    {c.type === "White Collar" && c.wcFluidIQ && (
                                                        <div className="flex items-center gap-2">
                                                            <BrainCircuit size={16} className="text-indigo-500" />
                                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                                IQ Score: {c.wcFluidIQ.correct}/3 ({c.wcFluidIQ.isHighIQ ? "Wybitny" : "Przeciętny"})
                                                                {c.wcFluidIQ.isFast && " | Szybki"}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {!c.bcQuiz && !c.wcFluidIQ && (
                                                        <div className="text-xs text-slate-500">Zakończono brak widocznych metryk.</div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                disabled={c.status === "W trakcie"}
                                                className="text-xs font-bold px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={() => alert("Wersja demonstracyjna: Otwarcie pełnego widoku w PDF/Popupie będzie dostępne w pełnej wersji.")}
                                            >
                                                Pełny Raport
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {candidates.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            Brak aktywności rekrutacyjnej w tym okresie.
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
