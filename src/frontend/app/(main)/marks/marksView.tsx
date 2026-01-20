"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/app/config/api";

// --- TYPY ---

type Mark = {
  gradeId: number;
  albumNr: number;
  subjectId: number;
  classId: number;
  subjectName?: string;
  classType?: string;
  value: string;
  weight: number;
  attempt: number;
  addedByName?: string;
  addedByTeachingStaffId?: number;
  comment: string;
  createdAt: string;
};

type SemesterData = {
  semester: string;
  year: string;
  marks: Mark[];
  average: number;
  totalCredits: number;
};

export default function MarksPage() {
  const [semesterData, setSemesterData] = useState<SemesterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedSemesters, setExpandedSemesters] = useState<string[]>([
    "Semestr letni 2024/25",
  ]);
  const API_BASE = getApiBaseUrl();

  // --- IKONY ---
  const ChevronDownIcon = () => (
    <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
    </svg>
  );

  // --- LOGIKA BIZNESOWA ---

  const calculateAverage = (marks: Mark[]): number => {
    if (marks.length === 0) return 0;
    const numericMarks = marks.filter((mark) => {
      const value = mark.value.replace(",", ".");
      return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
    });
    if (numericMarks.length === 0) return 0;
    const sum = numericMarks.reduce(
      (acc, mark) => acc + parseFloat(mark.value.replace(",", ".")),
      0
    );
    return Math.round((sum / numericMarks.length) * 100) / 100;
  };

  const groupMarksBySemester = (marks: Mark[]): SemesterData[] => {
    if (marks.length === 0) return [];
    // Tutaj w przyszłości można dodać logikę grupującą po polu 'semester' z API
    const currentSemester = {
      semester: "Semestr letni 2024/25",
      year: "2024/25",
      marks: marks,
      average: calculateAverage(marks),
      totalCredits: marks.length * 5, // Przykładowa logika ECTS
    };
    return [currentSemester];
  };

  const getGradeColor = (value: string) => {
    if (value === "ZAL") return "bg-green-600 text-white";
    if (value === "NZAL") return "bg-red-600 text-white";

    const numValue = parseFloat(value.replace(",", "."));
    if (isNaN(numValue)) return "bg-[var(--color-text-secondary)] text-white";

    if (numValue >= 4.5) return "bg-green-600 text-white";
    if (numValue >= 3.0) return "bg-[var(--color-accent)] text-white";
    return "bg-red-600 text-white";
  };

  const toggleSemester = (semester: string) => {
    setExpandedSemesters((prev) =>
      prev.includes(semester)
        ? prev.filter((s) => s !== semester)
        : [...prev, semester]
    );
  };

  // --- API FETCH ---

  const fetchMarks = async () => {
    try {
      setLoading(true);
      setError("");
      // Symulacja album_nr=1, docelowo pobierane z kontekstu usera
      const res = await fetch(`${API_BASE}/api/grades?album_nr=1`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Endpoint ocen nie jest dostępny");
        if (res.status === 500) throw new Error("Błąd serwera");
        throw new Error(`Błąd HTTP: ${res.status}`);
      }

      const data = await res.json();
      const marks = data.grades || [];
      const grouped = groupMarksBySemester(marks);
      setSemesterData(grouped);
    } catch (err: any) {
      console.error("Błąd podczas pobierania ocen:", err);
      setError(
        err.name === "TypeError" || err.message.includes("fetch")
          ? "Nie można połączyć się z serwerem."
          : "Nie udało się pobrać ocen"
      );
      setSemesterData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    fetchMarks();
  };

  // --- RENDER ---

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)] mb-4 mx-auto"></div>
          <p className="text-lg text-[var(--color-text-secondary)]">Ładowanie ocen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] pb-10">
      
      {/* Header Strony */}
      <div className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-accent)]/20 px-4 md:px-6 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-accent)] mb-1">
            Moje Oceny
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Wykaz ocen cząstkowych i końcowych.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        
        {/* Obsługa Błędów */}
        {error && (
          <div className="mb-6 bg-[var(--color-bg-secondary)] border border-red-500/50 rounded-lg p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-red-500 mb-1">Wystąpił błąd</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded transition-colors text-sm font-medium"
              >
                Spróbuj ponownie
              </button>
            </div>
          </div>
        )}

        {/* Karty Statystyk - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[var(--color-bg-secondary)] rounded-xl p-5 border border-[var(--color-text)]/5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
              Średnia ogólna
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">
              {semesterData.length > 0
                ? (semesterData.reduce((sum, sem) => sum + sem.average, 0) / semesterData.length).toFixed(2)
                : "0.00"}
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-xl p-5 border border-[var(--color-text)]/5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
              Punkty ECTS
            </h3>
            <p className="text-3xl font-bold text-[var(--color-text)]">
              {semesterData.reduce((sum, sem) => sum + sem.totalCredits, 0)}
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-xl p-5 border border-[var(--color-text)]/5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
              Liczba ocen
            </h3>
            <p className="text-3xl font-bold text-[var(--color-text)]">
              {semesterData.reduce((sum, sem) => sum + sem.marks.length, 0)}
            </p>
          </div>
        </div>

        {/* Lista Semestrów */}
        <div className="space-y-6">
          {semesterData.map((semester) => (
            <div key={semester.semester} className="bg-[var(--color-bg-secondary)] rounded-xl shadow-md overflow-hidden border border-[var(--color-text)]/5">
              
              {/* Nagłówek Semestru (Accordion) */}
              <button
                onClick={() => toggleSemester(semester.semester)}
                className="w-full bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg)] transition-colors border-b border-[var(--color-text)]/5 px-4 md:px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {expandedSemesters.includes(semester.semester) ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  <span className="font-bold text-lg md:text-xl text-left">{semester.semester}</span>
                </div>
                
                <div className="flex items-center gap-4 text-sm self-end md:self-auto">
                   <div className="bg-[var(--color-bg)] px-3 py-1 rounded border border-[var(--color-text)]/10">
                      <span className="text-[var(--color-text-secondary)] mr-2">Średnia:</span>
                      <strong className="text-[var(--color-accent)]">{semester.average}</strong>
                   </div>
                   <div className="bg-[var(--color-bg)] px-3 py-1 rounded border border-[var(--color-text)]/10">
                      <span className="text-[var(--color-text-secondary)] mr-2">ECTS:</span>
                      <strong className="text-[var(--color-text)]">{semester.totalCredits}</strong>
                   </div>
                </div>
              </button>

              {/* Zawartość Semestru */}
              {expandedSemesters.includes(semester.semester) && (
                <div className="p-4 md:p-6 bg-[var(--color-bg-secondary)]">
                  {semester.marks.length === 0 ? (
                    <p className="text-center py-6 text-[var(--color-text-secondary)] italic">
                      Brak ocen w tym semestrze
                    </p>
                  ) : (
                    <>
                      {/* --- WIDOK DESKTOP (TABELA) --- */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[var(--color-text)]/10 text-[var(--color-text-secondary)]">
                              <th className="text-left py-3 pr-4 font-semibold w-1/3">Przedmiot</th>
                              <th className="text-left py-3 px-2 font-semibold">Typ</th>
                              <th className="text-center py-3 px-2 font-semibold">Ocena</th>
                              <th className="text-center py-3 px-2 font-semibold">Waga</th>
                              <th className="text-center py-3 px-2 font-semibold">Próba</th>
                              <th className="text-left py-3 px-2 font-semibold">Prowadzący</th>
                              <th className="text-right py-3 pl-4 font-semibold">Data</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-text)]/5">
                            {semester.marks.map((mark) => (
                              <tr key={mark.gradeId} className="hover:bg-[var(--color-bg)]/50 transition-colors">
                                <td className="py-3 pr-4">
                                  <div className="font-medium text-[var(--color-text)]">
                                    {mark.subjectName || `Przedmiot ${mark.subjectId}`}
                                  </div>
                                  {mark.comment && (
                                    <div className="text-xs text-[var(--color-text-secondary)] mt-0.5 italic truncate max-w-xs">
                                      {mark.comment}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-2">
                                  <span className="px-2 py-0.5 bg-[var(--color-bg)] border border-[var(--color-text)]/10 text-[var(--color-text-secondary)] text-xs rounded uppercase font-bold tracking-wide">
                                    {mark.classType || "INNE"}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <span className={`px-2 py-1 rounded text-xs font-bold inline-block min-w-[3rem] text-center shadow-sm ${getGradeColor(mark.value)}`}>
                                    {mark.value}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-center text-[var(--color-text-secondary)]">{mark.weight}</td>
                                <td className="py-3 px-2 text-center">
                                  {mark.attempt > 1 ? (
                                    <span className="text-red-500 font-bold text-xs">{mark.attempt}</span>
                                  ) : (
                                    <span className="text-[var(--color-text-secondary)] opacity-30">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-2 text-[var(--color-text-secondary)] truncate max-w-[150px]" title={mark.addedByName}>
                                  {mark.addedByName || "-"}
                                </td>
                                <td className="py-3 pl-4 text-right text-[var(--color-text-secondary)] tabular-nums">
                                  {new Date(mark.createdAt).toLocaleDateString("pl-PL")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* --- WIDOK MOBILE (KARTY) --- */}
                      <div className="md:hidden space-y-3">
                         {semester.marks.map((mark) => (
                           <div key={mark.gradeId} className="bg-[var(--color-bg)] rounded-lg p-4 border border-[var(--color-text)]/5 shadow-sm">
                             <div className="flex justify-between items-start gap-3 mb-3">
                               <div>
                                  <h4 className="font-bold text-sm text-[var(--color-text)] leading-tight">
                                    {mark.subjectName || `Przedmiot ${mark.subjectId}`}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--color-text)]/10">
                                      {mark.classType || "INNE"}
                                    </span>
                                    {mark.attempt > 1 && (
                                       <span className="text-[10px] text-red-500 font-bold border border-red-500/20 px-1.5 py-0.5 rounded">
                                          Próba: {mark.attempt}
                                       </span>
                                    )}
                                  </div>
                               </div>
                               <span className={`px-2.5 py-1 rounded text-sm font-bold shadow-sm ${getGradeColor(mark.value)}`}>
                                 {mark.value}
                               </span>
                             </div>

                             <div className="grid grid-cols-2 gap-y-2 text-xs text-[var(--color-text-secondary)] pt-3 border-t border-[var(--color-text)]/5">
                                <div>
                                  <span className="block opacity-60">Prowadzący</span>
                                  <span className="font-medium text-[var(--color-text)]">{mark.addedByName || "-"}</span>
                                </div>
                                <div className="text-right">
                                  <span className="block opacity-60">Data</span>
                                  <span className="font-medium text-[var(--color-text)]">
                                     {new Date(mark.createdAt).toLocaleDateString("pl-PL")}
                                  </span>
                                </div>
                                {mark.weight > 0 && (
                                  <div>
                                    <span className="block opacity-60">Waga</span>
                                    <span>{mark.weight}</span>
                                  </div>
                                )}
                             </div>
                             
                             {mark.comment && (
                               <div className="mt-3 pt-2 border-t border-[var(--color-text)]/5 text-xs italic text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)]/50 p-2 rounded">
                                 „{mark.comment}”
                               </div>
                             )}
                           </div>
                         ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {semesterData.length === 0 && !loading && (
            <div className="bg-[var(--color-bg-secondary)] rounded-xl p-8 text-center border border-[var(--color-text)]/5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-[var(--color-text-secondary)] opacity-50 mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">Brak ocen</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Nie znaleziono żadnych ocen przypisanych do Twojego konta.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}