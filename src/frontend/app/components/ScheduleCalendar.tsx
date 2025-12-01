"use client";

import AcademicCalendar from "@/app/components/AcademicCalendar";

export default function CalendarPage() {
  return (
    <main className="min-h-screen px-6 py-6 text-[var(--color-text)] bg-[var(--color-bg)]">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Kalendarz Akademicki</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Harmonogram roku akademickiego, święta i wydarzenia.
          </p>
        </div>

        {/* KOMPONENT KALENDARZA */}
        <AcademicCalendar />

      </div>
    </main>
  );
}