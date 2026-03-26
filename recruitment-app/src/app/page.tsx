import Link from "next/link";
import { ArrowRight, HardHat, Briefcase } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/20 via-slate-50 to-slate-50 dark:from-blue-900/10 dark:via-slate-950 dark:to-slate-950 -z-10" />

      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            System Profilowania Kandydatów
          </h1>
          <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Weryfikacja predyspozycji psychofizycznych i analitycznych na stanowiska produkcyjne oraz inżynieryjno-zarządcze.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {/* Blue Collar Card */}
          <Link href="/blue-collar" className="group relative bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />

            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
              <HardHat size={28} />
            </div>

            <h2 className="text-2xl font-semibold mb-3">Moduł Produkcyjny</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Szybka weryfikacja zdolności manualnych, dokładności, tempa pracy i dyscypliny aplikantów fizycznych.
            </p>

            <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-1 transition-transform">
              Rozpocznij test zręcznościowy <ArrowRight size={18} className="ml-2" />
            </div>
          </Link>

          {/* White Collar Card */}
          <Link href="/white-collar" className="group relative bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />

            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
              <Briefcase size={28} />
            </div>

            <h2 className="text-2xl font-semibold mb-3">Moduł Biurowo-Inżynieryjny</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Pogłębione profilowanie analityczne i case study dla klastrów zarządczych, inżynieryjnych i wsparcia.
            </p>

            <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium group-hover:translate-x-1 transition-transform">
              Wybierz klaster ról <ArrowRight size={18} className="ml-2" />
            </div>
          </Link>
        </div>

        {/* HR Context Link */}
        <div className="pt-12 flex justify-center">
          <Link href="/hr-dashboard" className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-widest flex items-center gap-2">
            Logowanie dla autoryzowanego HR <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </main>
  );
}
