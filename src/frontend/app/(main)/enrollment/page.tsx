"use client";

import { useState, useEffect } from "react";

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

type AvailableSubject = {
  subjectId: number;
  subjectName: string;
  description: string;
  availableClasses: AvailableClass[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

export default function EnrollmentPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<AvailableSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<AvailableSubject | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [unenrolling, setUnenrolling] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"enrolled" | "available">("enrolled");

  // --- Pobierz zapisane przedmioty
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

  // --- Pobierz dostępne przedmioty
  const fetchAvailableSubjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/subjects`, { method: "GET", credentials: "include" });
      if (!res.ok) throw new Error("Nie udało się pobrać dostępnych przedmiotów");
      const data = await res.json();
      setAvailableSubjects(data.subjects || []);
    } catch (err: any) {
      console.error(err);
      setAvailableSubjects([]);
    }
  };

  // --- Inicjalne ładowanie danych
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEnrollments(), fetchAvailableSubjects()]);
      setLoading(false);
    };
    loadData();
  }, []);

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
      if (!res.ok) throw new Error(data.message || "Nie udało się zapisać na przedmiot");

      alert(`Pomyślnie zapisano na przedmiot! ID zapisu: ${data.enrollmentId}`);
      setSelectedSubject(null);
      setSelectedClasses([]);
      await fetchEnrollments();
      setActiveTab("enrolled");
    } catch (err: any) {
      console.error(err);
      alert(`Błąd: ${err.message}`);
    } finally {
      setEnrolling(false);
    }
  };

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
    } catch (err: any) {
      console.error(err);
      alert(`Błąd: ${err.message}`);
    } finally {
      setUnenrolling(null);
    }
  };

  const toggleClassSelection = (classId: number) => {
    setSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
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

        {/* --- Enrolled Tab --- */}
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

        {/* --- Available Tab --- */}
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
                  <div className="bg-[var(--color-accent)] text-white px-6 py-4">
                    <h2 className="text-xl font-semibold">{subject.subjectName}</h2>
                    <p className="text-sm opacity-90">{subject.description}</p>
                  </div>

                  <div className="p-6 space-y-4">
                    {subject.availableClasses.map((cls) => (
                      <div
                        key={cls.classId}
                        className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                          selectedSubject?.subjectId === subject.subjectId &&
                          selectedClasses.includes(cls.classId)
                            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                            : "border-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"
                        }`}
                        onClick={() => {
                          setSelectedSubject(subject);
                          toggleClassSelection(cls.classId);
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedSubject?.subjectId === subject.subjectId && selectedClasses.includes(cls.classId)}
                              onChange={() => {
                                setSelectedSubject(subject);
                                toggleClassSelection(cls.classId);
                              }}
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

                    {selectedSubject?.subjectId === subject.subjectId && selectedClasses.length > 0 && (
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
