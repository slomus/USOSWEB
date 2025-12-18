"use client";
import AcademicCalendar from "@/app/components/AcademicCalendar"; 

export default function DashboardPage() {
  return (
    <main className="min-h-screen p-6 bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Panel Nauczycielski - Kalendarz</h1>
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Harmonogram Roku</h2>
          <AcademicCalendar />
        </section>
      </div>
    </main>
  );
}