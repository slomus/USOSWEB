"use client";

import { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaSearch } from "react-icons/fa";
import { toast } from "react-toastify";

type Mark = {
  gradeId: number;
  albumNr: number;
  subjectId: number;
  classId: number;
  subjectName?: string;
  classType?: string;
  studentName?: string;
  value: string;
  weight: number;
  attempt: number;
  addedByName?: string;
  addedByTeachingStaffId?: number;
  comment: string;
  createdAt: string;
};

type Student = {
  userId: number;
  name: string;
  surname: string;
  email: string;
  albumNr?: number;
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
  as_teaching_staff_id: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

export default function AdminMarksManagementPage() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [filteredMarks, setFilteredMarks] = useState<Mark[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtry
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeIdSearch, setGradeIdSearch] = useState("");
  
  // Modalne okna
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMark, setEditingMark] = useState<Mark | null>(null);
  const [deletingMarkId, setDeletingMarkId] = useState<number | null>(null);
  
  // Search states for modal dropdowns
  const [studentSearch, setStudentSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  
  // Formularz nowej/edytowanej oceny
  const [markForm, setMarkForm] = useState<NewMarkForm>({
    albumNr: "",
    subjectId: "",
    classId: "1",
    value: "",
    weight: "1",
    attempt: "1",
    comment: "",
    as_teaching_staff_id: "",
  });

  // Pobieranie wszystkich danych
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Pobierz wszystkie oceny (dla wszystkich studentów)
      const marksRes = await fetch(`${API_BASE}/api/grades?all_students=true`, {
        credentials: "include",
      });
      if (marksRes.ok) {
        const marksData = await marksRes.json();
        console.log("Grades data:", marksData);
        console.log("First grade:", marksData.grades?.[0]);
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

      // Pobierz listę wykładowców
      const teachersRes = await fetch(`${API_BASE}/api/auth/users`, {
        credentials: "include",
      });
      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        const teachersList = teachersData.users?.filter((u: any) => u.role === "teacher") || [];
        console.log("Teachers data:", teachersList);
        console.log("First teacher:", teachersList[0]);
        setTeachers(teachersList);
      }

    } catch (err) {
      console.error("Błąd pobierania danych:", err);
      toast.error("Nie udało się pobrać danych");
    } finally {
      setLoading(false);
    }
  };

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
        m.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getStudentName(m.albumNr).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (gradeIdSearch && gradeIdSearch.trim() !== "") {
      filtered = filtered.filter(m => 
        m.gradeId.toString().includes(gradeIdSearch)
      );
    }

    setFilteredMarks(filtered);
  }, [selectedStudent, selectedSubject, searchTerm, gradeIdSearch, marks]);

  // Dodawanie nowej oceny
  const handleAddMark = async () => {
    if (!markForm.albumNr || !markForm.subjectId || !markForm.value) {
      toast.error("Wypełnij wymagane pola: student, przedmiot, ocena");
      return;
    }

    if (!markForm.as_teaching_staff_id) {
      toast.error("Wybierz wykładowcę prowadzącego");
      return;
    }

    try {
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
          as_teaching_staff_id: parseInt(markForm.as_teaching_staff_id),
        }),
      });

      if (response.ok) {
        toast.success("Ocena dodana pomyślnie!");
        setShowAddModal(false);
        resetForm();
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(`Błąd: ${errorData.message || "Nie udało się dodać oceny"}`);
      }
    } catch (err) {
      console.error("Błąd dodawania oceny:", err);
      toast.error("Wystąpił błąd podczas dodawania oceny");
    }
  };

  // Edycja oceny
  const handleEditMark = async () => {
    if (!editingMark) return;

    try {
      const response = await fetch(`${API_BASE}/api/grades/${editingMark.gradeId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade_id: editingMark.gradeId,
          value: markForm.value,
          weight: parseInt(markForm.weight),
          comment: markForm.comment,
        }),
      });

      if (response.ok) {
        toast.success("Ocena zaktualizowana pomyślnie!");
        setEditingMark(null);
        resetForm();
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(`Błąd: ${errorData.message || "Nie udało się zaktualizować oceny"}`);
      }
    } catch (err) {
      console.error("Błąd edycji oceny:", err);
      toast.error("Wystąpił błąd podczas edycji oceny");
    }
  };

  // Usuwanie oceny
  const handleDeleteMark = async (gradeId: number) => {
    if (!confirm("Czy na pewno chcesz usunąć tę ocenę?")) return;

    setDeletingMarkId(gradeId);
    try {
      const response = await fetch(`${API_BASE}/api/grades/${gradeId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Ocena usunięta pomyślnie!");
        setMarks(marks.filter(m => m.gradeId !== gradeId));
      } else {
        const errorData = await response.json();
        toast.error(`Błąd: ${errorData.message || "Nie udało się usunąć oceny"}`);
      }
    } catch (err) {
      console.error("Błąd usuwania oceny:", err);
      toast.error("Wystąpił błąd podczas usuwania oceny");
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
      as_teaching_staff_id: "",
    });
    setStudentSearch("");
    setSubjectSearch("");
    setTeacherSearch("");
  };

  const openEditModal = (mark: Mark) => {
    setEditingMark(mark);
    setMarkForm({
      albumNr: mark.albumNr.toString(),
      subjectId: mark.subjectId.toString(),
      classId: mark.classId.toString(),
      as_teaching_staff_id: mark.addedByTeachingStaffId?.toString() || "",
      value: mark.value,
      weight: mark.weight.toString(),
      attempt: mark.attempt.toString(),
      comment: mark.comment,
    });
  };

  const getStudentName = (albumNr: number) => {
    const student = students.find(s => s.albumNr === albumNr);
    return student ? `${student.name} ${student.surname} (${albumNr})` : `Album: ${albumNr}`;
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

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] items-center justify-center">
        <div className="text-xl">Ładowanie ocen...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex-1 flex flex-col">
        <main className="p-6 max-w-7xl mx-auto w-full pt-24">
          {/* Nagłówek */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold border-b border-[var(--color-accent)] pb-4">
              Zarządzanie Ocenami
            </h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition flex items-center gap-2"
            >
              <FaPlus /> Dodaj Ocenę
            </button>
          </div>

          {/* Statystyki */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
                Wszystkie Oceny
              </h3>
              <p className="text-3xl font-bold text-[var(--color-accent)]">{marks.length}</p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
                Studenci
              </h3>
              <p className="text-3xl font-bold text-[var(--color-accent)]">{students.length}</p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
                Przedmioty
              </h3>
              <p className="text-3xl font-bold text-[var(--color-accent)]">{subjects.length}</p>
            </div>
          </div>

          {/* Filtry i Wyszukiwanie */}
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-6 border border-[var(--color-accent)]">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaSearch /> Filtry i Wyszukiwanie
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Wyszukaj ocenę</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Szukaj..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ID Oceny</label>
                <input
                  type="text"
                  value={gradeIdSearch}
                  onChange={(e) => setGradeIdSearch(e.target.value)}
                  placeholder="ID oceny..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="">Wszyscy studenci</option>
                  {students.map((s) => (
                    <option key={s.userId} value={s.albumNr}>
                      {s.name} {s.surname} (Album: {s.albumNr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Przedmiot</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="">Wszystkie przedmioty</option>
                  {subjects.map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>
                      {s.name} ({s.alias})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 text-sm text-[var(--color-text-secondary)]">
              Znaleziono: {filteredMarks.length} ocen
            </div>
          </div>

          {/* Tabela ocen - KOMPAKTOWA */}
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
                  Nie znaleziono ocen spełniających kryteria wyszukiwania
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-accent)]/10">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">ID</th>
                      <th className="text-left py-3 px-4 font-semibold">Student</th>
                      <th className="text-left py-3 px-4 font-semibold">Przedmiot</th>
                      <th className="text-center py-3 px-4 font-semibold">Ocena</th>
                      <th className="text-center py-3 px-4 font-semibold">Waga</th>
                      <th className="text-center py-3 px-4 font-semibold">Podejście</th>
                      <th className="text-left py-3 px-4 font-semibold">Prowadzący</th>
                      <th className="text-left py-3 px-4 font-semibold">Data</th>
                      <th className="text-center py-3 px-4 font-semibold">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMarks.map((mark) => (
                      <tr
                        key={mark.gradeId}
                        className="border-b border-[var(--color-accent)]/20 hover:bg-[var(--color-bg-hover)] transition"
                      >
                        <td className="py-2 px-4 text-xs text-[var(--color-text-secondary)]">
                          #{mark.gradeId}
                        </td>
                        <td className="py-2 px-4">
                          <div className="font-semibold">
                          {mark.studentName || mark.studentName || getStudentName(mark.albumNr)}
                          </div>
                        </td>

                        <td className="py-2 px-4">
                          <div>{mark.subjectName || `ID: ${mark.subjectId}`}</div>
                          {mark.classType && (
                            <div className="text-xs text-[var(--color-text-secondary)]">{mark.classType}</div>
                          )}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <span className="px-2 py-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded font-semibold">
                            {mark.value}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center">{mark.weight}</td>
                        <td className="py-2 px-4 text-center">{mark.attempt}</td>
                        <td className="py-2 px-4 text-xs">
                          {mark.addedByName || "Brak danych"}
                        </td>
                        <td className="py-2 px-4 text-xs">
                          {formatDate(mark.createdAt)}
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(mark)}
                              className="p-1.5 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded transition"
                              title="Edytuj"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteMark(mark.gradeId)}
                              disabled={deletingMarkId === mark.gradeId}
                              className="p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] rounded transition disabled:opacity-50"
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

          {/* Modal Dodawania Oceny */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">Dodaj Ocenę</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                  >
                    <FaTimes size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Student <span className="text-red-500">*</span>
                    </label>
                    <input
                      list="students-list"
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        const student = students.find(s => 
                          `${s.name} ${s.surname} (${s.albumNr})` === e.target.value
                        );
                        if (student) {
                          setMarkForm({ ...markForm, albumNr: student.albumNr?.toString() || "" });
                        }
                      }}
                      placeholder="Szukaj studenta..."
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      required
                    />
                    <datalist id="students-list">
                      {students.map((s) => (
                        <option key={s.userId} value={`${s.name} ${s.surname} (${s.albumNr})`} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Przedmiot <span className="text-red-500">*</span>
                    </label>
                    <input
                      list="subjects-list"
                      value={subjectSearch}
                      onChange={(e) => {
                        setSubjectSearch(e.target.value);
                        const subject = subjects.find(s => 
                          `${s.name} (${s.alias})` === e.target.value
                        );
                        if (subject) {
                          setMarkForm({ ...markForm, subjectId: subject.subjectId.toString() });
                        }
                      }}
                      placeholder="Szukaj przedmiotu..."
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      required
                    />
                    <datalist id="subjects-list">
                      {subjects.map((s) => (
                        <option key={s.subjectId} value={`${s.name} (${s.alias})`} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Prowadzący <span className="text-red-500">*</span>
                    </label>
                    <input
                      list="teachers-list"
                      value={teacherSearch}
                      onChange={(e) => {
                        setTeacherSearch(e.target.value);
                        const teacher = teachers.find(t => 
                          `${t.name} ${t.surname}` === e.target.value
                        );
                        if (teacher) {
                          setMarkForm({ ...markForm, as_teaching_staff_id: teacher.teachingStaffId?.toString() || "" });
                        }
                      }}
                      placeholder="Szukaj wykładowcy..."
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      required
                    />
                    <datalist id="teachers-list">
                      {teachers.map((t) => (
                        <option key={t.userId} value={`${t.name} ${t.surname}`} />
                      ))}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Ocena <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={markForm.value}
                        onChange={(e) => setMarkForm({ ...markForm, value: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                        placeholder="np. 5.0, ZAL"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Waga</label>
                      <input
                        type="number"
                        value={markForm.weight}
                        onChange={(e) => setMarkForm({ ...markForm, weight: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Podejście</label>
                      <input
                        type="number"
                        value={markForm.attempt}
                        onChange={(e) => setMarkForm({ ...markForm, attempt: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">ID Zajęć</label>
                      <input
                        type="number"
                        value={markForm.classId}
                        onChange={(e) => setMarkForm({ ...markForm, classId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Komentarz</label>
                    <textarea
                      value={markForm.comment}
                      onChange={(e) => setMarkForm({ ...markForm, comment: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      rows={3}
                      placeholder="Opcjonalny komentarz do oceny"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleAddMark}
                    className="flex-1 px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2"
                  >
                    <FaSave /> Dodaj Ocenę
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:opacity-90 transition"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Edycji Oceny */}
          {editingMark && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-2xl w-full">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">Edytuj Ocenę #{editingMark.gradeId}</h2>
                  <button
                    onClick={() => {
                      setEditingMark(null);
                      resetForm();
                    }}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                  >
                    <FaTimes size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Ocena</label>
                      <input
                        type="text"
                        value={markForm.value}
                        onChange={(e) => setMarkForm({ ...markForm, value: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Waga</label>
                      <input
                        type="number"
                        value={markForm.weight}
                        onChange={(e) => setMarkForm({ ...markForm, weight: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                        min="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Komentarz</label>
                    <textarea
                      value={markForm.comment}
                      onChange={(e) => setMarkForm({ ...markForm, comment: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleEditMark}
                    className="flex-1 px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2"
                  >
                    <FaSave /> Zapisz Zmiany
                  </button>
                  <button
                    onClick={() => {
                      setEditingMark(null);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:opacity-90 transition"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}