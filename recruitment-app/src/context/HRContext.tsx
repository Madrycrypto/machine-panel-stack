"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type CandidateRecord = {
    id: string; // e.g. #78291
    type: "Blue Collar" | "White Collar" | "Unknown";
    status: "W trakcie" | "Zakończono" | "Oczekuje";
    startTime: string;
    // --- Blue Collar Metrics ---
    bcAgility?: { hits: number; misses: number; accuracy: number };
    bcFiveS?: { shadowboard: boolean; visualsearch: number; mistakes: number; profile: string };
    bcQuiz?: { compliance: number; availability: number; lieScale: number; unanswered: number; isLying: boolean };
    // --- White Collar Metrics ---
    wcFluidIQ?: { correct: number; totalTime: number; isHighIQ: boolean; isFast: boolean };
    wcInBasket?: any;
    wcCaseStudy?: any;
};

// Mock Initial DB (One active candidate, one finished historical candidate)
const INITIAL_DB: CandidateRecord[] = [
    {
        id: "#78291", // The one we are "testing" now
        type: "Blue Collar",
        status: "W trakcie",
        startTime: new Date(Date.now() - 15 * 60000).toISOString(), // 15 mins ago
    },
    {
        id: "#44120",
        type: "White Collar",
        status: "Zakończono",
        startTime: new Date(Date.now() - 24 * 60 * 60000).toISOString(), // 1 day ago
        wcFluidIQ: { correct: 3, totalTime: 22.5, isHighIQ: true, isFast: true }
    }
];

type HRContextType = {
    candidates: CandidateRecord[];
    addCandidate: (candidate: CandidateRecord) => void;
    updateCandidateScore: (id: string, module: keyof CandidateRecord, data: any) => void;
};

const HRContext = createContext<HRContextType | undefined>(undefined);

export function HRProvider({ children }: { children: ReactNode }) {
    const [candidates, setCandidates] = useState<CandidateRecord[]>(INITIAL_DB);

    const addCandidate = (candidate: CandidateRecord) => {
        setCandidates((prev) => [...prev, candidate]);
    };

    const updateCandidateScore = (id: string, module: keyof CandidateRecord, data: any) => {
        setCandidates((prev) =>
            prev.map(c => c.id === id ? { ...c, [module]: data, status: "Zakończono" } : c)
        );
    };

    return (
        <HRContext.Provider value={{ candidates, addCandidate, updateCandidateScore }}>
            {children}
        </HRContext.Provider>
    );
}

export function useHRDatabase() {
    const context = useContext(HRContext);
    if (context === undefined) {
        throw new Error("useHRDatabase must be used within a HRProvider");
    }
    return context;
}
