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

type TeacherClass = {
  classId: number;
  subjectId: number;
  subjectName: string;
  subjectAlias: string;
  classType: string;
  groupNr: number;
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

export default function TeacherMarksPage() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [filteredMarks, setFilteredMarks] = useState<Mark[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtry
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeIdSearch, setGradeIdSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // Modalne okna
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMark, setEditingMark] = useState<Mark | null>(null);
  const [deletingMarkId, setDeletingMarkId] = useState<number | null>(null);
  
  // Search states for modal dropdowns
  const [studentSearch, setStudentSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");
  
  // Formularz nowej/edytowanej oceny
  const [markForm, setMarkForm] = useState<NewMarkForm>({
    albumNr: "",
    subjectId: "",
    classId: "",
    value: "",
    weight: "1",
    attempt: "1",
    comment: "",
  });

  const [editForm, setEditForm] = useState({
    value: "",
    weight: "",
    comment: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Najpierw pobierz zajęcia prowadzone przez teachera
      const classesRes = await fetch(`${API_BASE}/api/teacher/classes`, {
        credentials: "include",
      });
      
      let teacherClassIds: number[] = [];
      if (classesRes.ok) {
        const classesData = await classesRes.json();
        console.log("Teacher classes:", classesData);
        setTeacherClasses(classesData.classes || []);
        teacherClassIds = classesData.classes?.map((c: TeacherClass) => c.classId) || [];
      }

      // Pobierz listę wszystkich studentów
      const studentsRes = await fetch(`${API_BASE}/api/auth/users`, {
        credentials: "include",
      });
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        const studentsList = studentsData.users?.filter((u: any) => u.role === "student") || [];
        setStudents(studentsList);

        // Pobierz oceny dla każdego studenta (API wymaga album_nr dla teachera)
        // Tylko oceny z zajęć prowadzonych przez tego teachera będą zwrócone przez backend
        const allGrades: Mark[] = [];
        
        // Batch requests - po 10 studentów naraz
        const batchSize = 10;
        for (let i = 0; i < studentsList.length; i += batchSize) {
          const batch = studentsList.slice(i, i + batchSize);
          const promises = batch.map(async (student: Student) => {
            if (student.albumNr) {
              try {
                const gradesRes = await fetch(`${API_BASE}/api/grades?album_nr=${student.albumNr}`, {
                  credentials: "include",
                });
                if (gradesRes.ok) {
                  const gradesData = await gradesRes.json();
                  return gradesData.grades || [];
                }
              } catch (err) {
                console.error(`Błąd pobierania ocen dla studenta ${student.albumNr}:`, err);
              }
            }
            return [];
          });
          
          const batchResults = await Promise.all(promises);
          batchResults.forEach(grades => allGrades.push(...grades));
        }
        
        console.log("All grades:", allGrades);
        console.log("First grade:", allGrades[0]);
        setMarks(allGrades);
        setFilteredMarks(allGrades);
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
      toast.error("Nie udało się pobrać danych");
    } finally {
      setLoading(false);
    }
  };

  // Filtrowanie ocen
  useEffect(() => {
    let filtered = [...marks];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.subjectName?.toLowerCase().includes(term) ||
        m.value.toLowerCase().includes(term) ||
        getStudentName(m.albumNr).toLowerCase().includes(term) ||
        m.comment.toLowerCase().includes(term)
      );
    }

    if (gradeIdSearch && gradeIdSearch.trim() !== "") {
      filtered = filtered.filter(m => 
        m.gradeId.toString().includes(gradeIdSearch)
      );
    }

    if (selectedStudent) {
      filtered = filtered.filter(m => m.albumNr.toString() === selectedStudent);
    }

    if (selectedSubject) {
      filtered = filtered.filter(m => m.subjectId.toString() === selectedSubject);
    }

    setFilteredMarks(filtered);
  }, [searchTerm, gradeIdSearch, selectedStudent, selectedSubject, marks]);

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

  // Dodawanie nowej oceny
  const handleAddMark = async () => {
    if (!markForm.albumNr || !markForm.subjectId || !markForm.value || !markForm.classId) {
      toast.error("Wypełnij wymagane pola: student, przedmiot, zajęcia, ocena");
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
    } catch (error) {
      console.error("Błąd dodawania oceny:", error);
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
          value: editForm.value,
          weight: parseInt(editForm.weight),
          comment: editForm.comment,
        }),
      });

      if (response.ok) {
        toast.success("Ocena zaktualizowana pomyślnie!");
        setEditingMark(null);
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(`Błąd: ${errorData.message || "Nie udało się zaktualizować oceny"}`);
      }
    } catch (error) {
      console.error("Błąd edycji oceny:", error);
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
    } catch (error) {
      console.error("Błąd usuwania oceny:", error);
      toast.error("Wystąpił błąd podczas usuwania oceny");
    } finally {
      setDeletingMarkId(null);
    }
  };

  const resetForm = () => {
    setMarkForm({
      albumNr: "",
      subjectId: "",
      classId: "",
      value: "",
      weight: "1",
      attempt: "1",
      comment: "",
    });
    setStudentSearch("");
    setSubjectSearch("");
    setClassSearch("");
  };

  const openEditModal = (mark: Mark) => {
    setEditingMark(mark);
    setEditForm({
      value: mark.value,
      weight: mark.weight.toString(),
      comment: mark.comment,
    });
  };

  // Filtruj zajęcia po wybranym przedmiocie
  const getFilteredClasses = () => {
    if (!markForm.subjectId) return [];
    return teacherClasses.filter(c => c.subjectId.toString() === markForm.subjectId);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] items-center justify-center">
        <div className="text-xl">Ładowanie ocen...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="max-w-7xl mx-auto p-6 pt-24">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[var(--color-accent)] mb-2 border-b border-[var(--color-accent)] pb-4">
              Zarządzanie Ocenami
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Zarządzaj ocenami studentów z Twoich zajęć
            </p>
          </div>
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
            <p className="text-3xl font-bold text-[var(--color-accent)]">
              {new Set(marks.map(m => m.albumNr)).size}
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
              Moje Przedmioty
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">
              {new Set(teacherClasses.map(c => c.subjectId)).size}
            </p>
          </div>
        </div>

        {/* Filtry */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-6 border border-[var(--color-accent)]">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FaSearch /> Filtrowanie
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Wyszukiwanie</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Szukaj..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ID Oceny</label>
              <input
                type="text"
                value={gradeIdSearch}
                onChange={(e) => setGradeIdSearch(e.target.value)}
                placeholder="np. 123"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
              >
                <option value="">Wszyscy</option>
                {students.map(s => (
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
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
              >
                <option value="">Wszystkie</option>
                {Array.from(new Set(teacherClasses.map(c => c.subjectId))).map(subjectId => {
                  const cls = teacherClasses.find(c => c.subjectId === subjectId);
                  return (
                    <option key={subjectId} value={subjectId}>
                      {cls?.subjectName} ({cls?.subjectAlias})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Tabela ocen */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg border border-[var(--color-accent)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-accent)]/10">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Student</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Przedmiot</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Ocena</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Waga</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Podejście</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Data</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-[var(--color-text-secondary)]">
                      Brak ocen do wyświetlenia
                    </td>
                  </tr>
                ) : (
                  filteredMarks.map((mark) => (
                    <tr
                      key={mark.gradeId}
                      className="border-t border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/5"
                    >
                      <td className="py-2 px-4 text-xs text-[var(--color-text-secondary)]">
                        #{mark.gradeId}
                      </td>
                      <td className="py-2 px-4">
                        <div className="font-semibold">{getStudentName(mark.albumNr)}</div>
                      </td>
                      <td className="py-2 px-4">
                        <div className="font-semibold">{mark.subjectName}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{mark.classType}</div>
                      </td>
                      <td className="py-2 px-4">
                        <span className="px-2 py-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded font-bold">
                          {mark.value}
                        </span>
                      </td>
                      <td className="py-2 px-4">{mark.weight}</td>
                      <td className="py-2 px-4">{mark.attempt}</td>
                      <td className="py-2 px-4 text-sm">
                        {formatDate(mark.createdAt)}
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(mark)}
                            className="p-1 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded transition"
                            title="Edytuj"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteMark(mark.gradeId)}
                            disabled={deletingMarkId === mark.gradeId}
                            className="p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] rounded transition disabled:opacity-50"
                            title="Usuń"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                      const classItem = teacherClasses.find(c => 
                        `${c.subjectName} (${c.subjectAlias})` === e.target.value
                      );
                      if (classItem) {
                        setMarkForm({ ...markForm, subjectId: classItem.subjectId.toString(), classId: "" });
                      }
                    }}
                    placeholder="Szukaj przedmiotu..."
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    required
                  />
                  <datalist id="subjects-list">
                    {Array.from(new Set(teacherClasses.map(c => c.subjectId))).map(subjectId => {
                      const cls = teacherClasses.find(c => c.subjectId === subjectId);
                      return (
                        <option key={subjectId} value={`${cls?.subjectName} (${cls?.subjectAlias})`} />
                      );
                    })}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Zajęcia <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={markForm.classId}
                    onChange={(e) => setMarkForm({ ...markForm, classId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    required
                    disabled={!markForm.subjectId}
                  >
                    <option value="">Wybierz zajęcia</option>
                    {getFilteredClasses().map((c) => (
                      <option key={c.classId} value={c.classId}>
                        {c.classType} - Grupa {c.groupNr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Ocena <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={markForm.value}
                      onChange={(e) => setMarkForm({ ...markForm, value: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      required
                    >
                      <option value="">Wybierz</option>
                      <option value="2.0">2.0</option>
                      <option value="3.0">3.0</option>
                      <option value="3.5">3.5</option>
                      <option value="4.0">4.0</option>
                      <option value="4.5">4.5</option>
                      <option value="5.0">5.0</option>
                      <option value="NZAL">NZAL</option>
                      <option value="ZAL">ZAL</option>
                    </select>
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
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-lg w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Edytuj Ocenę #{editingMark.gradeId}</h2>
                <button
                  onClick={() => setEditingMark(null)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Ocena</label>
                  <select
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                  >
                    <option value="2.0">2.0</option>
                    <option value="3.0">3.0</option>
                    <option value="3.5">3.5</option>
                    <option value="4.0">4.0</option>
                    <option value="4.5">4.5</option>
                    <option value="5.0">5.0</option>
                    <option value="NZAL">NZAL</option>
                    <option value="ZAL">ZAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Waga</label>
                  <input
                    type="number"
                    value={editForm.weight}
                    onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Komentarz</label>
                  <textarea
                    value={editForm.comment}
                    onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
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
                  onClick={() => setEditingMark(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:opacity-90 transition"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}