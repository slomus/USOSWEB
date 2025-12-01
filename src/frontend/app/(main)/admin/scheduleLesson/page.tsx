"use client";

import StudentSchedule from "@/app/components/Schedule";

export default function SchedulePage() {
  return (
    <main className="min-h-screen px-6 py-6 text-[var(--color-text)] bg-[var(--color-bg)]">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Plan zajęć</h1>
            <p className="text-[var(--color-text-secondary)] mt-1">
              Twój harmonogram na wybrany tydzień.
            </p>
          </div>
          {/* Kontrolki przeniesiono do komponentu StudentSchedule */}
        </div>

        {/* KOMPONENT PLANU */}
        <StudentSchedule />
        
      </div>
    </main>
  );
}