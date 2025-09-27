"use client";

import { useEffect, useState } from "react";

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
  addedBy?: string;
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
  const [expandedSemesters, setExpandedSemesters] = useState<string[]>(["Semestr letni 2024/25"]);

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

  const calculateAverage = (marks: Mark[]): number => {
    if (marks.length === 0) return 0;
    
    const numericMarks = marks.filter(mark => {
      const value = mark.value.replace(',', '.');
      return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
    });
    
    if (numericMarks.length === 0) return 0;
    
    const sum = numericMarks.reduce((acc, mark) => acc + parseFloat(mark.value.replace(',', '.')), 0);
    return Math.round((sum / numericMarks.length) * 100) / 100;
  };

  const groupMarksBySemester = (marks: Mark[]): SemesterData[] => {
    if (marks.length === 0) return [];
    
    const currentSemester = {
      semester: "Semestr letni 2024/25",
      year: "2024/25",
      marks: marks,
      average: calculateAverage(marks),
      totalCredits: marks.length * 5 
    };
    
    return [currentSemester];
  };

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        setLoading(true);
        setError("");
        
        const res = await fetch("http://localhost:8083/api/grades?album_nr=1", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Endpoint ocen nie jest dostępny");
          } else if (res.status === 500) {
            throw new Error("Błąd serwera");
          } else {
            throw new Error(`Błąd HTTP: ${res.status}`);
          }
        }

        const data = await res.json();
        console.log("Dane z API:", data); 
        
        const marks = data.grades || [];
        const grouped = groupMarksBySemester(marks);
        setSemesterData(grouped);
      } catch (err: any) {
        console.error("Błąd podczas pobierania ocen:", err);
        if (err.name === 'TypeError' || err.message.includes('fetch')) {
          setError("Nie można połączyć się z serwerem. Sprawdź czy backend jest uruchomiony.");
        } else {
          setError("Nie udało się pobrać ocen");
        }
        setSemesterData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMarks();
  }, []);

  const toggleSemester = (semester: string) => {
    setExpandedSemesters(prev => 
      prev.includes(semester) 
        ? prev.filter(s => s !== semester)
        : [...prev, semester]
    );
  };

  const getGradeColor = (value: string) => {
    if (value === "ZAL") return 'bg-[var(--color-accent)] text-white';
    if (value === "NZAL") return 'bg-[var(--color-accent2)] text-white';
    
    const numValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numValue)) return 'bg-[var(--color-text-secondary)] text-white';
    
    if (numValue >= 4.5) return 'bg-[var(--color-accent)] text-white';
    if (numValue >= 3.0) return 'bg-[var(--color-text-secondary)] text-white';
    return 'bg-[var(--color-accent2)] text-white';
  };

  const handleRetry = () => {
    setError("");
    setSemesterData([]);
    setLoading(true);
    
    const fetchMarks = async () => {
      try {
        const res = await fetch("http://localhost:8083/api/grades?album_nr=1", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!res.ok) {
          throw new Error(`Błąd HTTP: ${res.status}`);
        }

        const data = await res.json();
        const marks = data.grades || [];
        const grouped = groupMarksBySemester(marks);
        setSemesterData(grouped);
      } catch (err: any) {
        console.error("Błąd podczas pobierania ocen:", err);
        setError("Nie udało się pobrać ocen");
        setSemesterData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMarks();
  };

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
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <div className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-accent)] px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-[var(--color-accent)] mb-2">Informatyka</h1>
          <div className="flex items-center space-x-4 text-sm text-[var(--color-text-secondary)]">
            <span>drukuj kartę przebiegu studiów (po polsku) →</span>
            <span>drukuj kartę przebiegu studiów (po angielsku) →</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-[var(--color-bg-secondary)] border border-[var(--color-accent2)] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[var(--color-accent2)] mb-1">Uwaga</h3>
                <p className="text-[var(--color-text-secondary)]">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                className="bg-[var(--color-accent2)] hover:bg-[var(--color-accent)] text-white px-4 py-2 rounded transition-colors"
              >
                Ponów
              </button>
            </div>
          </div>
        )}

        {/* Statystyki ogólne */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-lg font-semibold text-[var(--color-accent)] mb-2">Średnia ogólna</h3>
            <p className="text-3xl font-bold">
              {semesterData.length > 0 
                ? (semesterData.reduce((sum, sem) => sum + sem.average, 0) / semesterData.length).toFixed(2)
                : "0.00"
              }
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-lg font-semibold text-[var(--color-accent)] mb-2">Łączne punkty ECTS</h3>
            <p className="text-3xl font-bold">
              {semesterData.reduce((sum, sem) => sum + sem.totalCredits, 0)}
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-lg font-semibold text-[var(--color-accent)] mb-2">Liczba ocen</h3>
            <p className="text-3xl font-bold">
              {semesterData.reduce((sum, sem) => sum + sem.marks.length, 0)}
            </p>
          </div>
        </div>

        {/* Sekcja główna */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg overflow-hidden">
          <div className="bg-[var(--color-accent)] text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Oceny końcowe z przedmiotów</h2>
          </div>

          <div className="divide-y divide-[var(--color-accent)]">
            {semesterData.map((semester) => (
              <div key={semester.semester}>
                <button
                  onClick={() => toggleSemester(semester.semester)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--color-bg)] transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {expandedSemesters.includes(semester.semester) ? (
                      <ChevronDownIcon />
                    ) : (
                      <ChevronRightIcon />
                    )}
                    <span className="font-semibold text-lg">{semester.semester}</span>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-[var(--color-text-secondary)]">
                    <span>Średnia: <strong className="text-[var(--color-accent)]">{semester.average}</strong></span>
                    <span>ECTS: <strong className="text-[var(--color-accent)]">{semester.totalCredits}</strong></span>
                  </div>
                </button>

                {expandedSemesters.includes(semester.semester) && (
                  <div className="px-6 pb-6">
                    {semester.marks.length === 0 ? (
                      <p className="text-center py-8 text-[var(--color-text-secondary)]">
                        Brak ocen w tym semestrze
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[var(--color-accent)]">
                              <th className="text-left py-3 pr-4 font-semibold">Przedmiot</th>
                              <th className="text-left py-3 px-4 font-semibold">Rodzaj</th>
                              <th className="text-center py-3 px-4 font-semibold">Ocena</th>
                              <th className="text-center py-3 px-4 font-semibold">Waga</th>
                              <th className="text-center py-3 px-4 font-semibold">Podejście</th>
                              <th className="text-left py-3 px-4 font-semibold">Prowadzący</th>
                              <th className="text-center py-3 pl-4 font-semibold">Data</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-accent)]">
                            {semester.marks.map((mark) => (
                              <tr key={mark.gradeId} className="hover:bg-[var(--color-bg)] transition-colors">
                                <td className="py-3 pr-4">
                                  <div>
                                    <div className="font-medium">
                                      {mark.subjectName || `Przedmiot ${mark.subjectId}`}
                                    </div>
                                    {mark.comment && (
                                      <div className="text-sm text-[var(--color-text-secondary)]">{mark.comment}</div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-1 bg-[var(--color-accent)] text-white text-xs rounded font-medium">
                                    {mark.classType || "LAB"}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-3 py-1 rounded-full font-bold ${getGradeColor(mark.value)}`}>
                                    {mark.value}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-medium">{mark.weight}</td>
                                <td className="py-3 px-4 text-center">
                                  {mark.attempt > 1 && (
                                    <span className="text-[var(--color-accent2)] font-medium">{mark.attempt}</span>
                                  )}
                                  {mark.attempt === 1 && <span className="text-[var(--color-text-secondary)]">-</span>}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {mark.addedBy || "Nieznany prowadzący"}
                                </td>
                                <td className="py-3 pl-4 text-center text-sm text-[var(--color-text-secondary)]">
                                  {new Date(mark.createdAt).toLocaleDateString("pl-PL", {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {semesterData.length === 0 && !loading && (
            <div className="px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-2">Brak ocen</h3>
              <p className="text-[var(--color-text-secondary)]">
                Nie znaleziono żadnych ocen w systemie dla Twojego konta.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}