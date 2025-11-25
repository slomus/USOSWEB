"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

// Typy
type ScheduleClass = {
  scheduleId: number;
  classId: number;
  subjectName: string;
  classType: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  building: string;
  instructorName: string;
};

// Polskie nazwy dni tygodnia
const daysOfWeek: Record<number, string> = {
  1: "Poniedziałek",
  2: "Wtorek",
  3: "Środa",
  4: "Czwartek",
  5: "Piątek",
  6: "Sobota",
  7: "Niedziela",
};

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  // Pobieranie planu tygodnia
  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append("date", selectedDate);

      const response = await fetch(
        `${API_BASE}/api/student/schedule/week?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();

      if (data.success) {
        setSchedule(data.schedule || []);
      } else {
        alert(`Błąd: ${data.message || "Nie udało się pobrać planu."}`);
      }
    } catch (error) {
      alert("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    // eslint-disable-next-line
  }, [selectedDate]);

  // Formatowanie godziny do HH:mm
  const formatHour = (timeString: string) => {
    // API zwraca format "HH:mm:ss", więc wycinamy pierwsze 5 znaków ("HH:mm")
    return timeString.slice(0, 5);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Plan zajęć</h1>
        {/* Filtr daty */}
        <div className="flex gap-3 mb-6 items-center">
          <label className="text-sm font-semibold">Data:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="p-2 rounded border bg-[var(--color-bg)] text-[var(--color-text)]"
          />
          <button
            onClick={fetchSchedule}
            disabled={loading}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] text-sm disabled:opacity-50"
          >
            {loading ? "Ładowanie..." : "Odśwież"}
          </button>
        </div>
        {/* Tabela planu */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] rounded-lg">
            <thead>
              <tr>
                <th className="p-2 border">Dzień</th>
                <th className="p-2 border">Godziny</th>
                <th className="p-2 border">Przedmiot</th>
                <th className="p-2 border">Typ</th>
                <th className="p-2 border">Sala</th>
                <th className="p-2 border">Prowadzący</th>
              </tr>
            </thead>
            <tbody>
              {schedule.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-4">
                    Brak zajęć w tym tygodniu.
                  </td>
                </tr>
              )}
              {schedule.map((cls, idx) => (
                <tr key={cls.scheduleId || idx}>
                  <td className="p-2 border">{daysOfWeek[cls.dayOfWeek]}</td>
                  <td className="p-2 border">
                    {formatHour(cls.startTime)} – {formatHour(cls.endTime)}
                  </td>
                  <td className="p-2 border">{cls.subjectName}</td>
                  <td className="p-2 border capitalize">{cls.classType}</td>
                  <td className="p-2 border">
                    {cls.room} <span className="text-xs text-[var(--color-text-secondary)]">({cls.building})</span>
                  </td>
                  <td className="p-2 border">{cls.instructorName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Styl zgodny z motywem */}
      <style jsx global>{`
        table th, table td {
          border-color: var(--color-accent);
        }
        table th {
          background: var(--color-bg);
          color: var(--color-text);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
