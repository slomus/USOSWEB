"use client";

import { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaSearch, FaFilter, FaUserGraduate } from "react-icons/fa";

type Grade = {
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
  studentName?: string;
  studentSurname?: string;
};

type Student = {
  user_id: number;
  name: string;
  surname: string;
  email: string;
  album_nr?: number;
  active: boolean;
  role: string;
};

type GradeForm = {
  albumNr: string;
  subjectId: string;
  classId: string;
  subjectName: string;
  classType: string;
  value: string;
  weight: string;
  attempt: string;
  comment: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

export default function TeacherGradesManagementPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [filteredGrades, setFilteredGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filtry
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Modalne okna
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [viewingGrade, setViewingGrade] = useState<Grade | null>(null);
  const [deletingGradeId, setDeletingGradeId] = useState<number | null>(null);
  
  // Formularz
  const [gradeForm, setGradeForm] = useState<GradeForm>({
    albumNr: "",
    subjectId: "1",
    classId: "1",
    subjectName: "",
    classType: "LAB",
    value: "",
    weight: "1",
    attempt: "1",
    comment: "",
  });

  // Pobieranie danych
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Pobierz listę studentów
        const studentsRes = await fetch(`${API_BASE}/api/auth/users`, {
          credentials: "include",
        });
        
        if (!studentsRes.ok) {
          throw new Error("Nie udało się pobrać listy studentów");
        }

        const studentsData = await studentsRes.json();
        const studentsList = studentsData.users?.filter((u: any) => u.role === "student") || [];
        setStudents(studentsList);

        // 2. Pobierz oceny dla każdego studenta
        const allGrades: Grade[] = [];
        
        for (const student of studentsList) {
          if (student.album_nr) {
            try {
              const gradesRes = await fetch(
                `${API_BASE}/api/grades?album_nr=${student.album_nr}`,
                { credentials: "include" }
              );
              
              if (gradesRes.ok) {
                const gradesData = await gradesRes.json();
                const studentGrades = (gradesData.grades || []).map((grade: any) => ({
                  ...grade,
                  studentName: student.name,
                  studentSurname: student.surname,
                }));
                allGrades.push(...studentGrades);
              }
            } catch (err) {
              console.error(`Błąd pobierania ocen dla studenta ${student.album_nr}:`, err);
            }
          }
        }

        setGrades(allGrades);
        setFilteredGrades(allGrades);
        setError("");
        
      } catch (err) {
        console.error("Błąd pobierania danych:", err);
        setError("Nie udało się pobrać danych");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtrowanie ocen
  useEffect(() => {
    let filtered = [...grades];

    if (selectedStudent) {
      filtered = filtered.filter(g => g.albumNr.toString() === selectedStudent);
    }

    if (selectedSubject) {
      filtered = filtered.filter(g => 
        g.subjectName?.toLowerCase().includes(selectedSubject.toLowerCase())
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(g => 
        g.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.studentSurname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.subjectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.albumNr.toString().includes(searchTerm)
      );
    }

    setFilteredGrades(filtered);
  }, [selectedStudent, selectedSubject, searchTerm, grades]);

  // Dodawanie nowej oceny
  const handleAddGrade = async () => {
    if (!gradeForm.albumNr || !gradeForm.value) {
      alert("Wypełnij wymagane pola: student i ocena");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/grades`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          album_nr: parseInt(gradeForm.albumNr),
          subject_id: parseInt(gradeForm.subjectId),
          class_id: parseInt(gradeForm.classId),
          value: gradeForm.value,
          weight: parseInt(gradeForm.weight),
          attempt: parseInt(gradeForm.attempt),
          comment: gradeForm.comment,
        }),
      });

      if (response.ok) {
        alert("Ocena dodana pomyślnie!");
        setShowAddModal(false);
        resetForm();
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Błąd: ${errorData.message || "Nie udało się dodać oceny"}`);
      }
    } catch (err) {
      console.error("Błąd dodawania oceny:", err);
      alert("Wystąpił błąd podczas dodawania oceny");
    }
  };

  // Edycja oceny
  const handleEditGrade = async () => {
    if (!editingGrade) return;

    try {
      const response = await fetch(`${API_BASE}/api/grades/${editingGrade.gradeId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: gradeForm.value,
          weight: parseInt(gradeForm.weight),
          attempt: parseInt(gradeForm.attempt),
          comment: gradeForm.comment,
        }),
      });

      if (response.ok) {
        alert("Ocena zaktualizowana pomyślnie!");
        setEditingGrade(null);
        resetForm();
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Błąd: ${errorData.message || "Nie udało się zaktualizować oceny"}`);
      }
    } catch (err) {
      console.error("Błąd edycji oceny:", err);
      alert("Wystąpił błąd podczas edycji oceny");
    }
  };

  // Usuwanie oceny
  const handleDeleteGrade = async (gradeId: number) => {
    if (!confirm("Czy na pewno chcesz usunąć tę ocenę? Tej operacji nie można cofnąć.")) return;

    setDeletingGradeId(gradeId);
    try {
      const response = await fetch(`${API_BASE}/api/grades/${gradeId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        alert("Ocena usunięta pomyślnie!");
        setGrades(grades.filter(g => g.gradeId !== gradeId));
      } else {
        const errorData = await response.json();
        alert(`Błąd: ${errorData.message || "Nie udało się usunąć oceny"}`);
      }
    } catch (err) {
      console.error("Błąd usuwania oceny:", err);
      alert("Wystąpił błąd podczas usuwania oceny");
    } finally {
      setDeletingGradeId(null);
    }
  };

  const resetForm = () => {
    setGradeForm({
      albumNr: "",
      subjectId: "1",
      classId: "1",
      subjectName: "",
      classType: "LAB",
      value: "",
      weight: "1",
      attempt: "1",
      comment: "",
    });
  };

  const openEditModal = (grade: Grade) => {
    setEditingGrade(grade);
    setGradeForm({
      albumNr: grade.albumNr.toString(),
      subjectId: grade.subjectId.toString(),
      classId: grade.classId.toString(),
      subjectName: grade.subjectName || "",
      classType: grade.classType || "LAB",
      value: grade.value,
      weight: grade.weight.toString(),
      attempt: grade.attempt.toString(),
      comment: grade.comment,
    });
  };

  const getGradeColor = (value: string) => {
    if (value === "ZAL") return "bg-[var(--color-accent)] text-white";
    if (value === "NZAL") return "bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)]";

    const numValue = parseFloat(value.replace(",", "."));
    if (isNaN(numValue)) return "bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)]";

    if (numValue >= 4.5) return "bg-[var(--color-accent)] text-white";
    if (numValue >= 3.0) return "bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)]";
    return "bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)]";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStudentName = (albumNr: number) => {
    const student = students.find(s => s.album_nr === albumNr);
    return student ? `${student.name} ${student.surname}` : `Album ${albumNr}`;
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

  const uniqueSubjects = Array.from(new Set(grades.map(g => g.subjectName).filter(Boolean)));
  const averageGrade = grades.length > 0 
    ? (grades.reduce((sum, g) => {
        const val = parseFloat(g.value.replace(",", "."));
        return isNaN(val) ? sum : sum + val;
      }, 0) / grades.filter(g => !isNaN(parseFloat(g.value.replace(",", ".")))).length).toFixed(2)
    : "0.00";

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <div className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-accent)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-accent)] mb-2">
              Zarządzanie Ocenami
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Panel wykładowcy - wystawiaj i zarządzaj ocenami studentów
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors font-semibold"
          >
            <FaPlus /> Dodaj Ocenę
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] rounded-lg p-4">
            <p className="text-[var(--color-accent)]">{error}</p>
          </div>
        )}

        {/* Filtry */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FaFilter /> Filtry i Wyszukiwanie
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              {showFilters ? "Ukryj" : "Pokaż"} filtry
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="">Wszyscy studenci</option>
                  {students.map((student) => (
                    <option key={student.user_id} value={student.album_nr}>
                      {student.name} {student.surname} (Album: {student.album_nr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Przedmiot</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="">Wszystkie przedmioty</option>
                  {uniqueSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Szukaj</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Student, przedmiot, album..."
                    className="w-full px-3 py-2 pl-10 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                  <FaSearch className="absolute left-3 top-3 text-[var(--color-text-secondary)]" />
                </div>
              </div>
            </div>
          )}

          {(selectedStudent || selectedSubject || searchTerm) && (
            <div className="mt-4 pt-4 border-t border-[var(--color-accent)]">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Znaleziono: <strong className="text-[var(--color-accent)]">{filteredGrades.length}</strong> ocen
                <button
                  onClick={() => {
                    setSelectedStudent("");
                    setSelectedSubject("");
                    setSearchTerm("");
                  }}
                  className="ml-4 text-[var(--color-accent)] hover:underline"
                >
                  Wyczyść filtry
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Wszystkie Oceny
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{grades.length}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
              <FaUserGraduate className="text-[var(--color-accent)]" /> Liczba Studentów
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{students.length}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Średnia Ocen
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{averageGrade}</p>
          </div>
        </div>

        {/* Lista ocen */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg overflow-hidden">
          <div className="bg-[var(--color-accent)] text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Lista Ocen</h2>
          </div>

          {filteredGrades.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-2">
                Brak ocen
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                Nie znaleziono żadnych ocen spełniających kryteria wyszukiwania
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-accent)]/10">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold">Student</th>
                    <th className="text-left py-4 px-4 font-semibold">Przedmiot</th>
                    <th className="text-center py-4 px-4 font-semibold">Typ</th>
                    <th className="text-center py-4 px-4 font-semibold">Ocena</th>
                    <th className="text-center py-4 px-4 font-semibold">Waga</th>
                    <th className="text-center py-4 px-4 font-semibold">Podejście</th>
                    <th className="text-left py-4 px-4 font-semibold">Data</th>
                    <th className="text-center py-4 px-6 font-semibold">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-accent)]/20">
                  {filteredGrades.map((grade) => (
                    <tr
                      key={grade.gradeId}
                      className="hover:bg-[var(--color-bg)] transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-medium">
                            {grade.studentName} {grade.studentSurname}
                          </div>
                          <div className="text-sm text-[var(--color-text-secondary)]">
                            Album: {grade.albumNr}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">
                          {grade.subjectName || `Przedmiot ${grade.subjectId}`}
                        </div>
                        {grade.comment && (
                          <div className="text-sm text-[var(--color-text-secondary)]">
                            {grade.comment}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2 py-1 bg-[var(--color-accent)] text-white text-xs rounded font-medium">
                          {grade.classType || "LAB"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full font-bold ${getGradeColor(
                            grade.value
                          )}`}
                        >
                          {grade.value}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center font-medium">
                        {grade.weight}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {grade.attempt > 1 ? (
                          <span className="text-[var(--color-accent)] font-medium">
                            {grade.attempt}
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-secondary)]">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-[var(--color-text-secondary)]">
                        {formatDate(grade.createdAt)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setViewingGrade(grade)}
                            className="px-3 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded hover:bg-[var(--color-accent)] hover:text-white transition-colors text-sm"
                          >
                            Podgląd
                          </button>
                          <button
                            onClick={() => openEditModal(grade)}
                            className="px-3 py-1 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] transition-colors text-sm"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteGrade(grade.gradeId)}
                            disabled={deletingGradeId === grade.gradeId}
                            className="px-3 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded hover:bg-[var(--color-accent)] hover:text-white transition-colors text-sm disabled:opacity-50"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal podglądu */}
      {viewingGrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-2xl w-full border border-[var(--color-accent)]">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-semibold text-[var(--color-accent)]">
                Szczegóły Oceny
              </h3>
              <button
                onClick={() => setViewingGrade(null)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <p><strong>Student:</strong> {viewingGrade.studentName} {viewingGrade.studentSurname}</p>
                  <p><strong>Nr albumu:</strong> {viewingGrade.albumNr}</p>
                  <p><strong>Przedmiot:</strong> {viewingGrade.subjectName || `ID: ${viewingGrade.subjectId}`}</p>
                  <p><strong>Typ zajęć:</strong> {viewingGrade.classType || "LAB"}</p>
                  <p><strong>Ocena:</strong> <span className={`px-2 py-1 rounded ${getGradeColor(viewingGrade.value)}`}>{viewingGrade.value}</span></p>
                  <p><strong>Waga:</strong> {viewingGrade.weight}</p>
                  <p><strong>Podejście:</strong> {viewingGrade.attempt}</p>
                  <p><strong>Data:</strong> {formatDate(viewingGrade.createdAt)}</p>
                </div>
                {viewingGrade.comment && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-accent)]">
                    <p className="text-sm"><strong>Komentarz:</strong></p>
                    <p className="text-sm mt-1">{viewingGrade.comment}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setViewingGrade(null)}
                className="px-6 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-colors"
              >
                Zamknij
              </button>
              <button
                onClick={() => {
                  openEditModal(viewingGrade);
                  setViewingGrade(null);
                }}
                className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-2"
              >
                <FaEdit /> Edytuj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal dodawania */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--color-accent)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-[var(--color-accent)]">
                Dodaj Nową Ocenę
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Student <span className="text-[var(--color-accent)]">*</span>
                </label>
                <select
                  value={gradeForm.albumNr}
                  onChange={(e) => setGradeForm({ ...gradeForm, albumNr: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  required
                >
                  <option value="">Wybierz studenta</option>
                  {students.map((student) => (
                    <option key={student.user_id} value={student.album_nr}>
                      {student.name} {student.surname} (Album: {student.album_nr})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nazwa przedmiotu</label>
                  <input
                    type="text"
                    value={gradeForm.subjectName}
                    onChange={(e) => setGradeForm({ ...gradeForm, subjectName: e.target.value })}
                    placeholder="np. Programowanie obiektowe"
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Typ zajęć</label>
                  <select
                    value={gradeForm.classType}
                    onChange={(e) => setGradeForm({ ...gradeForm, classType: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  >
                    <option value="LAB">Laboratorium</option>
                    <option value="LEC">Wykład</option>
                    <option value="PRO">Projekt</option>
                    <option value="SEM">Seminarium</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ocena <span className="text-[var(--color-accent)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={gradeForm.value}
                    onChange={(e) => setGradeForm({ ...gradeForm, value: e.target.value })}
                    placeholder="np. 4.5 lub ZAL"
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Waga</label>
                  <input
                    type="number"
                    value={gradeForm.weight}
                    onChange={(e) => setGradeForm({ ...gradeForm, weight: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Podejście</label>
                  <input
                    type="number"
                    value={gradeForm.attempt}
                    onChange={(e) => setGradeForm({ ...gradeForm, attempt: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Komentarz</label>
                <textarea
                  value={gradeForm.comment}
                  onChange={(e) => setGradeForm({ ...gradeForm, comment: e.target.value })}
                  rows={3}
                  placeholder="Dodatkowy komentarz do oceny..."
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] resize-vertical"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddGrade}
                  className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-2"
                >
                  <FaSave /> Dodaj Ocenę
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal edycji */}
      {editingGrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--color-accent)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-[var(--color-accent)]">
                Edytuj Ocenę
              </h3>
              <button
                onClick={() => {
                  setEditingGrade(null);
                  resetForm();
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--color-bg)] p-4 rounded-lg mb-4">
                <p className="text-sm">
                  <strong>Student:</strong> {editingGrade.studentName} {editingGrade.studentSurname} (Album: {editingGrade.albumNr})
                </p>
                <p className="text-sm">
                  <strong>Przedmiot:</strong> {editingGrade.subjectName || `ID: ${editingGrade.subjectId}`}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ocena <span className="text-[var(--color-accent)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={gradeForm.value}
                    onChange={(e) => setGradeForm({ ...gradeForm, value: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Waga</label>
                  <input
                    type="number"
                    value={gradeForm.weight}
                    onChange={(e) => setGradeForm({ ...gradeForm, weight: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Podejście</label>
                  <input
                    type="number"
                    value={gradeForm.attempt}
                    onChange={(e) => setGradeForm({ ...gradeForm, attempt: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Komentarz</label>
                <textarea
                  value={gradeForm.comment}
                  onChange={(e) => setGradeForm({ ...gradeForm, comment: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] resize-vertical"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setEditingGrade(null);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleEditGrade}
                  className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-2"
                >
                  <FaSave /> Zapisz Zmiany
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}