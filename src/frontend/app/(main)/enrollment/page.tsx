"use client";

import { useState, useEffect } from "react";

// --- Definicje typów ---

type Instructor = string;

type Schedule = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  classroom: number;
  buildingName: string;
};

type EnrolledClass = {
  classId: number;
  classType: string;
  groupNr: number;
  currentCapacity: number;
  capacity: number;
  availableSpots: number;
  schedule: Schedule[];
  instructors: Instructor[];
};

type Enrollment = {
  subjectId: number;
  subjectName: string;
  enrolledClasses: EnrolledClass[];
  enrolledAt: string;
};

type AvailableClass = {
  classId: number;
  classType: string;
  groupNr: number;
  currentCapacity: number;
  capacity: number;
  availableSpots: number;
  schedule: Schedule[];
  instructors: Instructor[];
};

// ZMIANA 1: Dodano pole 'isActive' do definicji typu zgodnie z Twoim JSON-em
type RegistrationPeriod = {
  id?: number; // Oznaczyłem jako opcjonalne, bo w Twoim JSON-ie go nie było, ale może wracać z backendu
  startDate: string;
  endDate: string;
  isActive: boolean; 
} | null;

type AvailableSubject = {
  subjectId: number;
  name: string;      
  alias: string;     
  ects: number;
  totalCapacity: number;
  totalEnrolled: number;
  availableSpots: number;
  isEnrolled: boolean;
  registrationPeriod: RegistrationPeriod; // Pole sterujące dostępnością zapisów
  availableClasses?: AvailableClass[];    // Pole opcjonalne, ładowane "lazy"
};

import { getApiBaseUrl } from "@/app/config/api";

const API_BASE = getApiBaseUrl();

export default function EnrollmentPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<AvailableSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState<number | null>(null);
  const [error, setError] = useState("");
  
  const [selectedSubject, setSelectedSubject] = useState<AvailableSubject | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  
  const [enrolling, setEnrolling] = useState(false);
  const [unenrolling, setUnenrolling] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"enrolled" | "available">("enrolled");

  // --- 1. Pobierz moje zapisy ---
  const fetchEnrollments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/enrollments`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Błąd HTTP: ${res.status}`);
      const data = await res.json();
      setEnrollments(data.enrollments || []);
      setError("");
    } catch (err: any) {
      console.error(err);
      setError("Nie udało się pobrać zapisów");
    }
  };

  // --- 2. Pobierz listę dostępnych przedmiotów (bez szczegółów klas) ---
  const fetchAvailableSubjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/subjects`, { method: "GET", credentials: "include" });
      if (!res.ok) throw new Error("Nie udało się pobrać dostępnych przedmiotów");
      const data = await res.json();
      
      // Mapujemy, aby upewnić się, że struktura jest bezpieczna
      const subjects = (data.subjects || []).map((sub: any) => ({
        ...sub,
        availableClasses: [] // Inicjalizacja pustą tablicą
      }));
      
      setAvailableSubjects(subjects);
    } catch (err: any) {
      console.error(err);
      setAvailableSubjects([]);
    }
  };

  // --- 3. Pobierz klasy dla konkretnego przedmiotu (Lazy Loading) ---
  const fetchClassesForSubject = async (subjectId: number) => {
    setLoadingClasses(subjectId);
    try {
      // Pobieramy szczegóły przedmiotu (w tym klasy)
      const res = await fetch(`${API_BASE}/api/subjects/${subjectId}`, { 
        method: "GET", 
        credentials: "include" 
      });
      
      if (!res.ok) throw new Error("Nie udało się pobrać szczegółów przedmiotu");
      const data = await res.json();
      
      // POPRAWKA: Dane są zagnieżdżone w obiekcie 'subject' -> 'classes'
      const newClasses = data.subject?.classes || [];

      // Aktualizujemy stan availableSubjects wstawiając pobrane klasy
      setAvailableSubjects((prev) =>
        prev.map((sub) =>
          sub.subjectId === subjectId
            ? { ...sub, availableClasses: newClasses }
            : sub
        )
      );
      
      // Jeśli przedmiot jest aktualnie wybrany, odświeżamy go w selectedSubject
      if (selectedSubject?.subjectId === subjectId) {
        setSelectedSubject((prev) => prev ? { ...prev, availableClasses: newClasses } : null);
      }

    } catch (err) {
      console.error("Błąd pobierania klas:", err);
      // Nie rzucamy alertu, żeby nie blokować UI, po prostu lista będzie pusta
    } finally {
      setLoadingClasses(null);
    }
  };

  // --- Inicjalizacja ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEnrollments(), fetchAvailableSubjects()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // --- Logika zapisu na przedmiot ---
  const handleEnroll = async () => {
    if (!selectedSubject || selectedClasses.length === 0) {
      alert("Wybierz przedmiot i przynajmniej jedne zajęcia");
      return;
    }
    setEnrolling(true);
    try {
      const res = await fetch(`${API_BASE}/api/enrollments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: selectedSubject.subjectId,
          class_ids: selectedClasses,
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        // Tłumaczenie błędu "registration period not active"
        if (data.message?.includes("registration period not active") || res.status === 400) {
           throw new Error("Tura zapisów na ten przedmiot nie jest obecnie aktywna.");
        }
        throw new Error(data.message || "Nie udało się zapisać na przedmiot");
      }

      alert(`Pomyślnie zapisano na przedmiot! ID zapisu: ${data.enrollmentId}`);
      setSelectedSubject(null);
      setSelectedClasses([]);
      
      // Odśwież dane
      await fetchEnrollments();
      await fetchAvailableSubjects();
      setActiveTab("enrolled");
      
    } catch (err: any) {
      console.error(err);
      alert(`Błąd: ${err.message}`);
    } finally {
      setEnrolling(false);
    }
  };

  // --- Logika wypisu z przedmiotu ---
  const handleUnenroll = async (subjectId: number) => {
    if (!confirm("Czy na pewno chcesz wypisać się z tego przedmiotu?")) return;
    setUnenrolling(subjectId);
    try {
      const res = await fetch(`${API_BASE}/api/enrollments/${subjectId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Nie udało się wypisać z przedmiotu");
      
      alert(data.message || "Pomyślnie wypisano z przedmiotu");
      await fetchEnrollments();
      await fetchAvailableSubjects();
    } catch (err: any) {
      console.error(err);
      alert(`Błąd: ${err.message}`);
    } finally {
      setUnenrolling(null);
    }
  };

  // --- Helpers ---
  const toggleClassSelection = (classId: number) => {
    setSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSubjectClick = (subject: AvailableSubject) => {
    // Jeśli już wybrany - nic nie rób (lub zwiń)
    if (selectedSubject?.subjectId === subject.subjectId) {
        // Opcjonalnie: odznaczanie przy ponownym kliknięciu
        // setSelectedSubject(null); 
        return;
    }

    setSelectedSubject(subject);
    setSelectedClasses([]);

    // Jeśli przedmiot nie ma załadowanych klas, pobierz je
    if (!subject.availableClasses || subject.availableClasses.length === 0) {
      fetchClassesForSubject(subject.subjectId);
    }
  };

  // ZMIANA 2: Sprawdzenie, czy registrationPeriod istnieje ORAZ czy flaga isActive jest true
  const isRegistrationActive = (subject: AvailableSubject) => {
    return subject.registrationPeriod?.isActive === true;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getCapacityColor = (availableSpots: number, capacity: number) => {
    const ratio = availableSpots / capacity;
    if (ratio > 0.3) return "text-green-600";
    if (ratio > 0.1) return "text-yellow-600";
    return "text-red-600";
  };

  // --- Renderowanie ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)] mb-4 mx-auto"></div>
          <p className="text-lg text-[var(--color-text-secondary)]">Ładowanie danych...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Nagłówek */}
      <div className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-accent)] px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-[var(--color-accent)] mb-2">
            Rejestracja na przedmioty
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Zarządzaj swoimi zapisami na zajęcia
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-[var(--color-bg-secondary)] border border-[var(--color-accent2)] rounded-lg p-4">
            <h3 className="font-semibold text-[var(--color-accent2)] mb-1">Uwaga</h3>
            <p className="text-[var(--color-text-secondary)]">{error}</p>
          </div>
        )}

        {/* Zakładki */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("enrolled")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "enrolled"
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-bg-secondary)] text-[var(--color-text)] hover:bg-[var(--color-accent)] hover:text-white"
            }`}
          >
            Moje zapisy ({enrollments.length})
          </button>
          <button
            onClick={() => setActiveTab("available")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "available"
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-bg-secondary)] text-[var(--color-text)] hover:bg-[var(--color-accent)] hover:text-white"
            }`}
          >
            Dostępne przedmioty ({availableSubjects.length})
          </button>
        </div>

        {/* --- Zakładka: Zapisane przedmioty --- */}
        {activeTab === "enrolled" && (
          <div className="space-y-6">
            {enrollments.length === 0 ? (
              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-12 text-center">
                <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-2">Brak zapisów</h3>
                <p className="text-[var(--color-text-secondary)] mb-4">Nie jesteś zapisany na żadne przedmioty</p>
                <button
                  onClick={() => setActiveTab("available")}
                  className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
                >
                  Przeglądaj dostępne przedmioty
                </button>
              </div>
            ) : (
              enrollments.map((enrollment) => (
                <div key={enrollment.subjectId} className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-[var(--color-accent)] text-white px-6 py-4 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold">{enrollment.subjectName}</h2>
                      <p className="text-sm opacity-90">Zapisano: {formatDate(enrollment.enrolledAt)}</p>
                    </div>
                    <button
                      onClick={() => handleUnenroll(enrollment.subjectId)}
                      disabled={unenrolling === enrollment.subjectId}
                      className="px-4 py-2 bg-[var(--color-accent2)] text-white rounded hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {unenrolling === enrollment.subjectId ? "Wypisywanie..." : "Wypisz się"}
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {enrollment.enrolledClasses.map((cls) => (
                      <div key={cls.classId} className="border border-[var(--color-accent)] rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">{cls.classType} - Grupa {cls.groupNr}</h4>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              Prowadzący: {cls.instructors.join(", ")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${getCapacityColor(cls.availableSpots, cls.capacity)}`}>
                              Wolne miejsca: {cls.availableSpots}/{cls.capacity}
                            </p>
                            <p className="text-sm text-[var(--color-text-secondary)]">Zapisanych: {cls.currentCapacity}</p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-[var(--color-accent)] space-y-2">
                          {cls.schedule.map((sch, idx) => (
                            <div key={idx} className="flex justify-between text-sm bg-[var(--color-bg)] p-2 rounded">
                              <span className="font-medium">{sch.dayOfWeek}</span>
                              <span>{sch.startTime} - {sch.endTime}</span>
                              <span>Sala {sch.classroom}, {sch.buildingName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- Zakładka: Dostępne przedmioty --- */}
        {activeTab === "available" && (
          <div className="space-y-6">
            {availableSubjects.length === 0 ? (
              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-12 text-center">
                <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-2">Brak dostępnych przedmiotów</h3>
                <p className="text-[var(--color-text-secondary)]">Obecnie nie ma dostępnych przedmiotów do zapisu</p>
              </div>
            ) : (
              availableSubjects.map((subject) => (
                <div key={subject.subjectId} className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-[var(--color-accent)] text-white px-6 py-4 flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-semibold">{subject.name}</h2>
                        <p className="text-sm opacity-90">{subject.alias} • ECTS: {subject.ects}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p>Wolnych miejsc: {subject.availableSpots}</p>
                        {/* Status Rejestracji */}
                        {isRegistrationActive(subject) ? (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-bold">
                                Rejestracja otwarta
                            </span>
                        ) : (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                                Rejestracja zamknięta
                            </span>
                        )}
                      </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Przycisk rozwijania lub komunikat o blokadzie */}
                    {isRegistrationActive(subject) ? (
                        <>
                            {selectedSubject?.subjectId !== subject.subjectId && (
                                <button 
                                    onClick={() => handleSubjectClick(subject)}
                                    className="w-full text-left p-4 border border-dashed border-[var(--color-accent)] text-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent)]/5 transition-colors"
                                >
                                    {loadingClasses === subject.subjectId ? "Pobieranie grup zajęciowych..." : "Kliknij, aby wybrać grupy zajęciowe"}
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-4 bg-[var(--color-bg)]/50 border border-dashed border-red-300 rounded-lg text-gray-500 text-sm">
                            Wybór grup zablokowany - brak aktywnej tury zapisów.
                        </div>
                    )}

                    {/* Lista klas (tylko gdy aktywna tura i przedmiot wybrany) */}
                    {isRegistrationActive(subject) && selectedSubject?.subjectId === subject.subjectId && (
                        <>
                            {loadingClasses === subject.subjectId && (
                                <div className="text-center py-4">
                                    <span className="text-[var(--color-accent)]">Ładowanie planu...</span>
                                </div>
                            )}

                            {(!subject.availableClasses || subject.availableClasses.length === 0) && loadingClasses !== subject.subjectId && (
                                <div className="text-center py-4 text-[var(--color-text-secondary)]">
                                    Brak zdefiniowanych grup zajęciowych dla tego przedmiotu.
                                </div>
                            )}

                            {/* Lista klas */}
                            {(subject.availableClasses || []).map((cls) => (
                              <div
                                key={cls.classId}
                                className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                                  selectedClasses.includes(cls.classId)
                                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                                    : "border-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"
                                }`}
                                onClick={() => toggleClassSelection(cls.classId)}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedClasses.includes(cls.classId)}
                                      onChange={() => toggleClassSelection(cls.classId)}
                                      className="mt-1"
                                    />
                                    <div>
                                      <h4 className="font-semibold text-lg">{cls.classType} - Grupa {cls.groupNr}</h4>
                                      <p className="text-sm text-[var(--color-text-secondary)]">Prowadzący: {cls.instructors.join(", ")}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={`font-semibold ${getCapacityColor(cls.availableSpots, cls.capacity)}`}>
                                      Wolne miejsca: {cls.availableSpots}/{cls.capacity}
                                    </p>
                                    <p className="text-sm text-[var(--color-text-secondary)]">Zapisanych: {cls.currentCapacity}</p>
                                  </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-[var(--color-text-secondary)] space-y-2">
                                  {cls.schedule.map((sch, idx) => (
                                    <div key={idx} className="flex justify-between text-sm bg-[var(--color-bg)] p-2 rounded">
                                      <span className="font-medium">{sch.dayOfWeek}</span>
                                      <span>{sch.startTime} - {sch.endTime}</span>
                                      <span>Sala {sch.classroom}, {sch.buildingName}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}

                            {/* Panel akcji (Zapisz / Anuluj) */}
                            {selectedClasses.length > 0 && (
                              <div className="mt-6 p-4 bg-[var(--color-accent)]/10 border border-[var(--color-accent)] rounded-lg">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-semibold">Wybrano {selectedClasses.length} {selectedClasses.length === 1 ? "zajęcia" : "zajęć"}</p>
                                    <p className="text-sm text-[var(--color-text-secondary)]">Kliknij przycisk aby zapisać się na przedmiot</p>
                                  </div>
                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => { setSelectedSubject(null); setSelectedClasses([]); }}
                                      className="px-4 py-2 bg-[var(--color-text-secondary)] text-white rounded hover:bg-[var(--color-accent)] transition-colors"
                                    >
                                      Anuluj
                                    </button>
                                    <button
                                      onClick={handleEnroll}
                                      disabled={enrolling}
                                      className="px-6 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {enrolling ? "Zapisywanie..." : "Zapisz się"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                        </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}