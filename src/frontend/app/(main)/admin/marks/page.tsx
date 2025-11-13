"use client";

import { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaSearch, FaFilter } from "react-icons/fa";

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

type Student = {
  user_id: number;
  name: string;
  surname: string;
  email: string;
  album_nr?: number;
};

type Subject = {
  subjectId: number;
  alias: string;
  name: string;
  ects: number;
};

type NewMarkForm = {
  albumNr: string;
  subjectId: string;
  classId: string;
  value: string;
  weight: string;
  attempt: string;
  comment: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

export default function AdminMarksManagementPage() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [filteredMarks, setFilteredMarks] = useState<Mark[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filtry
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Modalne okna
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMark, setEditingMark] = useState<Mark | null>(null);
  const [deletingMarkId, setDeletingMarkId] = useState<number | null>(null);
  
  // Formularz nowej/edytowanej oceny
  const [markForm, setMarkForm] = useState<NewMarkForm>({
    albumNr: "",
    subjectId: "",
    classId: "1",
    value: "",
    weight: "1",
    attempt: "1",
    comment: "",
  });

  // Pobieranie wszystkich danych
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Pobierz wszystkie oceny (dla wszystkich studentów)
        const marksRes = await fetch(`${API_BASE}/api/grades`, {
          credentials: "include",
        });
        if (marksRes.ok) {
          const marksData = await marksRes.json();
          setMarks(marksData.grades || []);
          setFilteredMarks(marksData.grades || []);
        }

        // Pobierz listę studentów
        const studentsRes = await fetch(`${API_BASE}/api/auth/users`, {
          credentials: "include",
        });
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          const studentsList = studentsData.users?.filter((u: any) => u.role === "student") || [];
          setStudents(studentsList);
        }

        // Pobierz przedmioty
        const subjectsRes = await fetch(`${API_BASE}/api/subjects`, {
          credentials: "include",
        });
        if (subjectsRes.ok) {
          const subjectsData = await subjectsRes.json();
          setSubjects(subjectsData.subjects || []);
        }

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
    let filtered = [...marks];

    if (selectedStudent) {
      filtered = filtered.filter(m => m.albumNr.toString() === selectedStudent);
    }

    if (selectedSubject) {
      filtered = filtered.filter(m => m.subjectId.toString() === selectedSubject);
    }

    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.subjectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.comment.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMarks(filtered);
  }, [selectedStudent, selectedSubject, searchTerm, marks]);

  // Dodawanie nowej oceny
  const handleAddMark = async () => {
    if (!markForm.albumNr || !markForm.subjectId || !markForm.value) {
      alert("Wypełnij wymagane pola: student, przedmiot, ocena");
      return;
    }

    try {
      // UWAGA: Ten endpoint nie istnieje jeszcze w backendzie
      // Trzeba będzie dodać POST /api/grades
      const response = await fetch(`${API_BASE}/api/grades`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          album_nr: parseInt(markForm.albumNr),
          subject_id: parseInt(markForm.subjectId),
          class_id: parseInt(markForm.classId),
          value: markForm.value,
          weight: parseInt(markForm.weight),
          attempt: parseInt(markForm.attempt),
          comment: markForm.comment,
        }),
      });

      if (response.ok) {
        alert("Ocena dodana pomyślnie!");
        setShowAddModal(false);
        resetForm();
        // Odśwież listę ocen
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Błąd: ${errorData.message || "Nie udało się dodać oceny"}`);
      }
    } catch (err) {
      console.error("Błąd dodawania oceny:", err);
      alert("Endpoint nie jest jeszcze dostępny. Skontaktuj się z backendem.");
    }
  };

  // Edycja oceny
  const handleEditMark = async () => {
    if (!editingMark) return;

    try {
      // UWAGA: Ten endpoint nie istnieje jeszcze w backendzie
      // Trzeba będzie dodać PUT /api/grades/{grade_id}
      const response = await fetch(`${API_BASE}/api/grades/${editingMark.gradeId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: markForm.value,
          weight: parseInt(markForm.weight),
          attempt: parseInt(markForm.attempt),
          comment: markForm.comment,
        }),
      });

      if (response.ok) {
        alert("Ocena zaktualizowana pomyślnie!");
        setEditingMark(null);
        resetForm();
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Błąd: ${errorData.message || "Nie udało się zaktualizować oceny"}`);
      }
    } catch (err) {
      console.error("Błąd edycji oceny:", err);
      alert("Endpoint nie jest jeszcze dostępny. Skontaktuj się z backendem.");
    }
  };

  // Usuwanie oceny
  const handleDeleteMark = async (gradeId: number) => {
    if (!confirm("Czy na pewno chcesz usunąć tę ocenę?")) return;

    setDeletingMarkId(gradeId);
    try {
      // UWAGA: Ten endpoint nie istnieje jeszcze w backendzie
      // Trzeba będzie dodać DELETE /api/grades/{grade_id}
      const response = await fetch(`${API_BASE}/api/grades/${gradeId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        alert("Ocena usunięta pomyślnie!");
        setMarks(marks.filter(m => m.gradeId !== gradeId));
      } else {
        const errorData = await response.json();
        alert(`Błąd: ${errorData.message || "Nie udało się usunąć oceny"}`);
      }
    } catch (err) {
      console.error("Błąd usuwania oceny:", err);
      alert("Endpoint nie jest jeszcze dostępny. Skontaktuj się z backendem.");
    } finally {
      setDeletingMarkId(null);
    }
  };

  const resetForm = () => {
    setMarkForm({
      albumNr: "",
      subjectId: "",
      classId: "1",
      value: "",
      weight: "1",
      attempt: "1",
      comment: "",
    });
  };

  const openEditModal = (mark: Mark) => {
    setEditingMark(mark);
    setMarkForm({
      albumNr: mark.albumNr.toString(),
      subjectId: mark.subjectId.toString(),
      classId: mark.classId.toString(),
      value: mark.value,
      weight: mark.weight.toString(),
      attempt: mark.attempt.toString(),
      comment: mark.comment,
    });
  };

  const getGradeColor = (value: string) => {
    if (value === "ZAL") return "bg-green-500 text-white";
    if (value === "NZAL") return "bg-red-500 text-white";

    const numValue = parseFloat(value.replace(",", "."));
    if (isNaN(numValue)) return "bg-gray-500 text-white";

    if (numValue >= 4.5) return "bg-green-500 text-white";
    if (numValue >= 3.0) return "bg-yellow-500 text-white";
    return "bg-red-500 text-white";
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
              Panel administratora - dodawaj, edytuj i usuwaj oceny studentów
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
          <div className="mb-6 bg-red-50 border border-red-300 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filtry i wyszukiwanie */}
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
                  {subjects.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.name}
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
                    placeholder="Przedmiot, ocena, komentarz..."
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
                Znaleziono: <strong className="text-[var(--color-accent)]">{filteredMarks.length}</strong> ocen
                <button
                  onClick={() => {
                    setSelectedStudent("");
                    setSelectedSubject("");
                    setSearchTerm("");
                  }}
                  className="ml-4 text-[var(--color-accent2)] hover:underline"
                >
                  Wyczyść filtry
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Wszystkie Oceny
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{marks.length}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Studenci
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{students.length}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Przedmioty
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{subjects.length}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Średnia
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">
              {marks.length > 0
                ? (
                    marks
                      .filter(m => !isNaN(parseFloat(m.value.replace(",", "."))))
                      .reduce((sum, m) => sum + parseFloat(m.value.replace(",", ".")), 0) /
                    marks.filter(m => !isNaN(parseFloat(m.value.replace(",", ".")))).length
                  ).toFixed(2)
                : "0.00"}
            </p>
          </div>
        </div>

        {/* Tabela ocen */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg overflow-hidden">
          <div className="bg-[var(--color-accent)] text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Lista Ocen</h2>
          </div>

          {filteredMarks.length === 0 ? (
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
                    <th className="text-center py-4 px-4 font-semibold">Ocena</th>
                    <th className="text-center py-4 px-4 font-semibold">Waga</th>
                    <th className="text-center py-4 px-4 font-semibold">Podejście</th>
                    <th className="text-left py-4 px-4 font-semibold">Komentarz</th>
                    <th className="text-center py-4 px-4 font-semibold">Data</th>
                    <th className="text-center py-4 px-6 font-semibold">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-accent)]/20">
                  {filteredMarks.map((mark) => (
                    <tr
                      key={mark.gradeId}
                      className="hover:bg-[var(--color-bg)] transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="font-medium">{getStudentName(mark.albumNr)}</div>
                        <div className="text-sm text-[var(--color-text-secondary)]">
                          Album: {mark.albumNr}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">
                          {mark.subjectName || `Przedmiot ${mark.subjectId}`}
                        </div>
                        <div className="text-sm text-[var(--color-text-secondary)]">
                          {mark.classType || "LAB"}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full font-bold ${getGradeColor(
                            mark.value
                          )}`}
                        >
                          {mark.value}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center font-medium">
                        {mark.weight}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {mark.attempt > 1 ? (
                          <span className="text-[var(--color-accent2)] font-medium">
                            {mark.attempt}
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-secondary)]">1</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="max-w-xs truncate" title={mark.comment}>
                          {mark.comment || "-"}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-sm text-[var(--color-text-secondary)]">
                        {new Date(mark.createdAt).toLocaleDateString("pl-PL", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(mark)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="Edytuj"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteMark(mark.gradeId)}
                            disabled={deletingMarkId === mark.gradeId}
                            className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                            title="Usuń"
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

      {/* Modal dodawania oceny */}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Student <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={markForm.albumNr}
                    onChange={(e) => setMarkForm({ ...markForm, albumNr: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                    required
                  >
                    <option value="">Wybierz studenta</option>
                    {students.map((student) => (
                      <option key={student.user_id} value={student.album_nr}>
                        {student.name} {student.surname} (Nr albumu: {student.album_nr})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Przedmiot <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={markForm.subjectId}
                    onChange={(e) => setMarkForm({ ...markForm, subjectId: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                    required
                  >
                    <option value="">Wybierz przedmiot</option>
                    {subjects.map((subject) => (
                      <option key={subject.subjectId} value={subject.subjectId}>
                        {subject.name} ({subject.alias})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ocena <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={markForm.value}
                    onChange={(e) => setMarkForm({ ...markForm, value: e.target.value })}
                    placeholder="np. 4.5, ZAL"
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Waga</label>
                  <input
                    type="number"
                    value={markForm.weight}
                    onChange={(e) => setMarkForm({ ...markForm, weight: e.target.value })}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Podejście</label>
                  <input
                    type="number"
                    value={markForm.attempt}
                    onChange={(e) => setMarkForm({ ...markForm, attempt: e.target.value })}
                    min="1"
                    max="3"
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Komentarz</label>
                <textarea
                  value={markForm.comment}
                  onChange={(e) => setMarkForm({ ...markForm, comment: e.target.value })}
                  rows={3}
                  placeholder="Opcjonalny komentarz do oceny..."
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] resize-vertical"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Uwaga:</strong> Endpoint POST /api/grades nie jest jeszcze zaimplementowany w backendzie.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-[var(--color-text-secondary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddMark}
                  className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-2"
                >
                  <FaSave /> Dodaj Ocenę
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal edycji oceny */}
      {editingMark && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--color-accent)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-[var(--color-accent)]">
                Edytuj Ocenę
              </h3>
              <button
                onClick={() => {
                  setEditingMark(null);
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
                  <strong>Student:</strong> {getStudentName(editingMark.albumNr)}
                </p>
                <p className="text-sm">
                  <strong>Przedmiot:</strong> {editingMark.subjectName || `ID: ${editingMark.subjectId}`}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ocena <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={markForm.value}
                    onChange={(e) => setMarkForm({ ...markForm, value: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Waga</label>
                  <input
                    type="number"
                    value={markForm.weight}
                    onChange={(e) => setMarkForm({ ...markForm, weight: e.target.value })}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Podejście</label>
                  <input
                    type="number"
                    value={markForm.attempt}
                    onChange={(e) => setMarkForm({ ...markForm, attempt: e.target.value })}
                    min="1"
                    max="3"
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Komentarz</label>
                <textarea
                  value={markForm.comment}
                  onChange={(e) => setMarkForm({ ...markForm, comment: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] resize-vertical"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Uwaga:</strong> Endpoint PUT /api/grades/:id nie jest jeszcze zaimplementowany w backendzie.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setEditingMark(null);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-[var(--color-text-secondary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleEditMark}
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