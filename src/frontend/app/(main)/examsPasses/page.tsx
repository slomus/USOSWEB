"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface Exam {
  examId: number;
  classId: number;
  subjectName: string;
  examDate: string;
  location: string;
  durationMinutes: number;
  description: string;
  examType: string;
  maxStudents: number;
  classType: string;
}

export default function ExamsAndGradesPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const zaliczenia = [
    {
      kierunek: "Informatyka [SP-INF]",
      etap: "1 rok, 1 sem., informatyka [SP-INF-11]",
      cykl: "2022Z",
      dataZakonczenia: "2023-02-21",
      status: "A - zaliczony automatycznie",
    },
    {
      kierunek: "Informatyka [SP-INF]",
      etap: "1 rok, 2 sem., informatyka [SP-INF-12]",
      cykl: "2022L",
      dataZakonczenia: "2023-09-30",
      status: "A - zaliczony automatycznie",
    },
    {
      kierunek:
        "2 rok, 3 sem., informatyka, moduł: programowanie aplikacji biznesowych [SP-INF-mPB-23]",
      cykl: "2023Z",
      dataZakonczenia: "2024-02-25",
      status: "A - zaliczony automatycznie",
    },
    {
      kierunek:
        "2 rok, 4 sem., informatyka, moduł: programowanie aplikacji biznesowych [SP-INF-mPB-24]",
      cykl: "2023L",
      dataZakonczenia: "2024-09-30",
      status: "A - zaliczony automatycznie",
    },
  ];

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);

      // Pobierz nadchodzące egzaminy - zwiększam zakres żeby pokazać historię
      const examsResponse = await fetch(
        "http://localhost:8083/api/student/exams/upcoming?days_ahead=365",
        {
          credentials: "include",
        }
      );

      console.log("Exams response status:", examsResponse.status);

      if (examsResponse.ok) {
        const examsData = await examsResponse.json();
        console.log("Exams data:", examsData);

        if (examsData.exams) {
          setExams(examsData.exams);
        } else if (Array.isArray(examsData)) {
          setExams(examsData);
        } else {
          console.log("Unexpected exams structure");
        }
      } else {
        console.error("Exams fetch failed:", examsResponse.statusText);
      }
    } catch (error) {
      console.error("Błąd podczas pobierania egzaminów:", error);
      toast.error("Nie udało się pobrać egzaminów");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Brak daty";
    const date = new Date(dateString);
    return date.toLocaleString("pl-PL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getExamTypeLabel = (type: string) => {
    switch (type) {
      case "final":
        return "Egzamin";
      case "retake":
        return "Egzamin poprawkowy";
      case "midterm":
        return "Kolokwium";
      default:
        return type;
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex-1 flex flex-col">
        <main className="p-6 max-w-6xl mx-auto w-full pt-24">
          {/* Nagłówek strony */}
          <h1 className="text-4xl font-bold mb-8 border-b border-[var(--color-accent)] pb-4">
            Zaliczenia i Egzaminy
          </h1>

          {/* Sekcja Zaliczenia Etapów - STATIC DATA */}
          <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
            <h2 className="text-2xl font-semibold mb-6">
              Zaliczenia etapów studiów
            </h2>
            <div className="space-y-4">
              {zaliczenia.map((z, i) => (
                <div
                  key={i}
                  className="border border-[var(--color-accent)] rounded-xl p-4 bg-[var(--color-bg)] shadow-md"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{z.etap}</h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {z.kierunek}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p>
                      <strong>Cykl:</strong> {z.cykl}
                    </p>
                    <p>
                      <strong>Data zakończenia:</strong> {z.dataZakonczenia}
                    </p>
                    <p>
                      <strong>Status zaliczenia:</strong> {z.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sekcja Egzaminy - FROM API */}
          <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
            <h2 className="text-2xl font-semibold mb-6">Historia egzaminów</h2>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-[var(--color-text-secondary)]">Ładowanie egzaminów...</p>
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[var(--color-text-secondary)]">
                  Brak zaplanowanych egzaminów
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg)] border-b border-[var(--color-accent)]">
                      <th className="p-3">Przedmiot</th>
                      <th className="p-3">Typ</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Lokalizacja</th>
                      <th className="p-3">Czas trwania</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam, index) => (
                      <tr
                        key={`exam-${exam.examId}-${index}`}
                        className="border-b border-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition"
                      >
                        <td className="p-3">
                          <div>
                            <div className="font-semibold">{exam.subjectName}</div>
                            <div className="text-sm text-[var(--color-text-secondary)]">
                              {exam.classType}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">{getExamTypeLabel(exam.examType)}</td>
                        <td className="p-3">{formatDateTime(exam.examDate)}</td>
                        <td className="p-3">{exam.location}</td>
                        <td className="p-3">{exam.durationMinutes} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}