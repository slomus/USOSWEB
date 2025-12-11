"use client";

import { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaSearch } from "react-icons/fa";
import { toast } from "react-toastify";

// ==================== TYPY ====================

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

// Typy z /api/admin/grade-options
type GradeOptionStudent = {
  albumNr: number;
  name: string;
  course: string;
};

type GradeOptionTeacher = {
  teachingStaffId: number;
  name: string;
  subjects: number[];
};

type GradeOptionSubject = {
  subjectId: number;
  name: string;
  alias: string;
};

type GradeOptionClass = {
  classId: number;
  subjectId: number;
  subjectName: string;
  classType: string;
  groupNr: number;
  teacherIds: number[];        // lista teachingStaffId (backend używa teacherIds)
  studentAlbumNrs: number[];   // lista albumNr (backend używa studentAlbumNrs)
};

type GradeOptions = {
  students: GradeOptionStudent[];
  teachers: GradeOptionTeacher[];
  subjects: GradeOptionSubject[];
  classes: GradeOptionClass[];
};

type NewMarkForm = {
  albumNr: string;
  classId: string;
  value: string;
  weight: string;
  attempt: string;
  comment: string;
  as_teaching_staff_id: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

export default function AdminMarksManagementPage() {
  // ==================== STAN ====================
  const [marks, setMarks] = useState<Mark[]>([]);
  const [filteredMarks, setFilteredMarks] = useState<Mark[]>([]);
  const [gradeOptions, setGradeOptions] = useState<GradeOptions | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtry tabeli
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeIdSearch, setGradeIdSearch] = useState("");

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMark, setEditingMark] = useState<Mark | null>(null);
  const [deletingMarkId, setDeletingMarkId] = useState<number | null>(null);

  // Formularz dodawania/edycji
  const [markForm, setMarkForm] = useState<NewMarkForm>({
    albumNr: "",
    classId: "",
    value: "",
    weight: "1",
    attempt: "1",
    comment: "",
    as_teaching_staff_id: "",
  });

  // ==================== EFEKTY ====================

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedStudentFilter, selectedSubjectFilter, searchTerm, gradeIdSearch, marks]);

  // ==================== POBIERANIE DANYCH ====================

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Pobierz wszystkie oceny
      const marksRes = await fetch(`${API_BASE}/api/grades?all_students=true`, {
        credentials: "include",
      });

      if (marksRes.ok) {
        const marksData = await marksRes.json();
        setMarks(marksData.grades || []);
        setFilteredMarks(marksData.grades || []);
      }

      // 2. Pobierz dane do formularza z /api/admin/grade-options
      const optionsRes = await fetch(`${API_BASE}/api/admin/grade-options`, {
        credentials: "include",
      });

      if (optionsRes.ok) {
        const optionsData = await optionsRes.json();
        
        // Debug - loguj surowe dane z API
        console.log("=== DEBUG: Odpowiedź z /api/admin/grade-options ===");
        console.log("Cała odpowiedź:", optionsData);
        console.log("Students:", optionsData.students);
        console.log("Teachers:", optionsData.teachers);
        console.log("Subjects:", optionsData.subjects);
        console.log("Classes:", optionsData.classes);
        if (optionsData.classes?.length > 0) {
          console.log("Przykładowa klasa - wszystkie pola:", Object.keys(optionsData.classes[0]));
          console.log("Przykładowa klasa - wartości:", optionsData.classes[0]);
        }
        
        setGradeOptions({
          students: optionsData.students || [],
          teachers: optionsData.teachers || [],
          subjects: optionsData.subjects || [],
          classes: optionsData.classes || [],
        });
      } else {
        toast.error("Nie udało się pobrać opcji formularza ocen");
      }
    } catch (err) {
      console.error("Błąd pobierania danych:", err);
      toast.error("Nie udało się pobrać danych");
    } finally {
      setLoading(false);
    }
  };

  // ==================== FILTROWANIE TABELI ====================

  const applyFilters = () => {
    let filtered = [...marks];

    if (selectedStudentFilter) {
      filtered = filtered.filter((m) => String(m.albumNr) === selectedStudentFilter);
    }

    if (selectedSubjectFilter) {
      filtered = filtered.filter((m) => String(m.subjectId) === selectedSubjectFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.subjectName?.toLowerCase().includes(term) ||
          m.value.toLowerCase().includes(term) ||
          m.comment?.toLowerCase().includes(term)
      );
    }

    if (gradeIdSearch) {
      filtered = filtered.filter((m) => m.gradeId.toString().includes(gradeIdSearch));
    }

    setFilteredMarks(filtered);
  };

  // ==================== LOGIKA FORMULARZA (NOWY WORKFLOW) ====================

  // Krok 1: Po wybraniu studenta → pokaż tylko klasy, na które jest zapisany
  const getClassesForStudent = (): GradeOptionClass[] => {
    if (!gradeOptions || !markForm.albumNr) return [];
    
    const albumNr = Number(markForm.albumNr);
    
    // Debug - sprawdź strukturę danych
    console.log("=== DEBUG getClassesForStudent ===");
    console.log("albumNr:", albumNr);
    console.log("Wszystkie klasy:", gradeOptions.classes);
    if (gradeOptions.classes.length > 0) {
      console.log("Przykładowa klasa:", gradeOptions.classes[0]);
      console.log("Pola klasy:", Object.keys(gradeOptions.classes[0]));
    }
    
    return gradeOptions.classes.filter((cls) => {
      // Backend używa studentAlbumNrs
      const studentsList = cls.studentAlbumNrs || [];
      return Array.isArray(studentsList) && studentsList.includes(albumNr);
    });
  };

  // Krok 2: Po wybraniu klasy → pokaż tylko nauczycieli przypisanych do tej klasy
  const getTeachersForClass = (): GradeOptionTeacher[] => {
    if (!gradeOptions || !markForm.classId) return [];

    const cls = gradeOptions.classes.find((c) => c.classId === Number(markForm.classId));
    if (!cls) return [];

    // Backend używa teacherIds
    const teachersList = cls.teacherIds || [];
    if (!Array.isArray(teachersList)) return [];
    
    return gradeOptions.teachers.filter((t) => teachersList.includes(t.teachingStaffId));
  };

  // Pomocnicza: pobierz wybraną klasę (do wyświetlenia nazwy przedmiotu)
  const getSelectedClass = (): GradeOptionClass | undefined => {
    if (!gradeOptions || !markForm.classId) return undefined;
    return gradeOptions.classes.find((c) => c.classId === Number(markForm.classId));
  };

  // Handler zmiany studenta - resetuje klasę i nauczyciela
  const onStudentChange = (albumNr: string) => {
    setMarkForm({
      ...markForm,
      albumNr,
      classId: "",
      as_teaching_staff_id: "",
    });
  };

  // Handler zmiany klasy - resetuje nauczyciela
  const onClassChange = (classId: string) => {
    setMarkForm({
      ...markForm,
      classId,
      as_teaching_staff_id: "",
    });
  };

  // Reset formularza
  const resetForm = () => {
    setMarkForm({
      albumNr: "",
      classId: "",
      value: "",
      weight: "1",
      attempt: "1",
      comment: "",
      as_teaching_staff_id: "",
    });
  };

  // ==================== OPERACJE CRUD ====================

  const handleAddMark = async () => {
    // Walidacja
    if (!markForm.albumNr || !markForm.classId || !markForm.value || !markForm.as_teaching_staff_id) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    // Pobierz subject_id z wybranej klasy
    const selectedClass = getSelectedClass();
    if (!selectedClass) {
      toast.error("Nie można znaleźć wybranej klasy");
      return;
    }

    const requestBody = {
      album_nr: Number(markForm.albumNr),
      subject_id: selectedClass.subjectId,  // automatycznie z klasy
      class_id: Number(markForm.classId),
      value: markForm.value,
      weight: Number(markForm.weight),
      attempt: Number(markForm.attempt),
      comment: markForm.comment || undefined,
      as_teaching_staff_id: Number(markForm.as_teaching_staff_id),
    };

    try {
      const res = await fetch(`${API_BASE}/api/grades`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Nie udało się dodać oceny");
        return;
      }

      toast.success("Ocena dodana!");
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Błąd podczas dodawania oceny");
    }
  };

  const handleEditMark = async () => {
    if (!editingMark) return;

    try {
      const res = await fetch(`${API_BASE}/api/grades/${editingMark.gradeId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: markForm.value,
          weight: Number(markForm.weight),
          comment: markForm.comment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Nie udało się edytować oceny");
        return;
      }

      toast.success("Ocena zaktualizowana!");
      setEditingMark(null);
      resetForm();
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Błąd podczas edycji oceny");
    }
  };

  const handleDeleteMark = async (gradeId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/grades/${gradeId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Nie udało się usunąć oceny");
        return;
      }

      toast.success("Ocena usunięta!");
      setDeletingMarkId(null);
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Błąd podczas usuwania oceny");
    }
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] items-center justify-center">
        <div className="text-xl">Ładowanie ocen...</div>
      </div>
    );
  }

  const classesForStudent = getClassesForStudent();
  const teachersForClass = getTeachersForClass();
  const selectedClass = getSelectedClass();

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex-1 flex flex-col">
        <main className="p-6 max-w-7xl mx-auto w-full pt-24">

          {/* ============ NAGŁÓWEK ============ */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold border-b border-[var(--color-accent)] pb-4">
              Zarządzanie Ocenami
            </h1>

            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition flex items-center gap-2"
            >
              <FaPlus /> Dodaj Ocenę
            </button>
          </div>

          {/* ============ STATYSTYKI ============ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Wszystkie oceny</h3>
              <p className="text-3xl font-bold">{marks.length}</p>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Studentów z ocenami</h3>
              <p className="text-3xl font-bold">{new Set(marks.map((m) => m.albumNr)).size}</p>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Przedmiotów</h3>
              <p className="text-3xl font-bold">{new Set(marks.map((m) => m.subjectId)).size}</p>
            </div>
          </div>

          {/* ============ FILTRY TABELI ============ */}
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 mb-6 border border-[var(--color-accent)]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Szukaj tekstowo */}
              <div>
                <label className="block text-sm font-medium mb-2">Szukaj</label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Przedmiot, ocena..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                  />
                </div>
              </div>

              {/* ID oceny */}
              <div>
                <label className="block text-sm font-medium mb-2">ID oceny</label>
                <input
                  type="text"
                  placeholder="Szukaj po ID..."
                  value={gradeIdSearch}
                  onChange={(e) => setGradeIdSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                />
              </div>

              {/* Filtr studenta */}
              <div>
                <label className="block text-sm font-medium mb-2">Student</label>
                <select
                  value={selectedStudentFilter}
                  onChange={(e) => setSelectedStudentFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                >
                  <option value="">Wszyscy</option>
                  {gradeOptions?.students.map((s) => (
                    <option key={s.albumNr} value={s.albumNr}>
                      {s.name} ({s.albumNr})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtr przedmiotu */}
              <div>
                <label className="block text-sm font-medium mb-2">Przedmiot</label>
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                >
                  <option value="">Wszystkie</option>
                  {gradeOptions?.subjects.map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ============ TABELA OCEN ============ */}
          <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg overflow-hidden">
            <div className="bg-[var(--color-accent)] text-white px-6 py-4">
              <h2 className="text-xl font-semibold">Lista Ocen ({filteredMarks.length})</h2>
            </div>

            {filteredMarks.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-secondary)]">
                Brak ocen do wyświetlenia
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-bg)] border-b border-[var(--color-accent)]">
                    <tr>
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">Przedmiot</th>
                      <th className="px-4 py-3 text-left">Typ</th>
                      <th className="px-4 py-3 text-left">Ocena</th>
                      <th className="px-4 py-3 text-left">Waga</th>
                      <th className="px-4 py-3 text-left">Wystawił</th>
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-right">Akcje</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredMarks.map((mark) => {
                      // Znajdź imię studenta
                      const student = gradeOptions?.students.find((s) => s.albumNr === mark.albumNr);
                      const studentName = student?.name || `Album: ${mark.albumNr}`;

                      return (
                        <tr key={mark.gradeId} className="border-b border-[var(--color-accent)]/20 hover:bg-[var(--color-bg)]">
                          <td className="px-4 py-3">{mark.gradeId}</td>
                          <td className="px-4 py-3">{mark.studentName || studentName}</td>
                          <td className="px-4 py-3">{mark.subjectName || mark.subjectId}</td>
                          <td className="px-4 py-3">{mark.classType || "-"}</td>
                          <td className="px-4 py-3 font-bold">{mark.value}</td>
                          <td className="px-4 py-3">{mark.weight}</td>
                          <td className="px-4 py-3">{mark.addedByName || "-"}</td>
                          <td className="px-4 py-3">{mark.createdAt?.split(" ")[0]}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              {/* Edycja */}
                              <button
                                onClick={() => {
                                  setEditingMark(mark);
                                  setMarkForm({
                                    albumNr: mark.albumNr.toString(),
                                    classId: mark.classId.toString(),
                                    as_teaching_staff_id: mark.addedByTeachingStaffId?.toString() || "",
                                    value: mark.value,
                                    weight: mark.weight.toString(),
                                    attempt: mark.attempt.toString(),
                                    comment: mark.comment || "",
                                  });
                                }}
                                className="p-2 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 rounded"
                                title="Edytuj"
                              >
                                <FaEdit />
                              </button>

                              {/* Usuwanie */}
                              <button
                                onClick={() => setDeletingMarkId(mark.gradeId)}
                                className="p-2 text-red-600 hover:bg-red-600/20 rounded"
                                title="Usuń"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ============ MODAL DODAWANIA OCENY ============ */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">Dodaj Ocenę</h2>
                  <button onClick={() => setShowAddModal(false)}>
                    <FaTimes size={24} />
                  </button>
                </div>

                {/* Info o workflow */}
                <div className="mb-4 p-3 bg-blue-600/20 border border-blue-600 rounded text-blue-200 text-sm">
                  <strong>Workflow:</strong> Wybierz studenta → System pokaże tylko zajęcia, na które jest zapisany → Wybierz zajęcia → Wybierz prowadzącego
                </div>

                <div className="space-y-4">

                  {/* ===== KROK 1: STUDENT ===== */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      1. Student <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={markForm.albumNr}
                      onChange={(e) => onStudentChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    >
                      <option value="">Wybierz studenta...</option>
                      {gradeOptions?.students.map((s) => (
                        <option key={s.albumNr} value={s.albumNr}>
                          {s.name} (Album: {s.albumNr}) - {s.course}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ===== KROK 2: ZAJĘCIA (filtrowane po studencie) ===== */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      2. Zajęcia <span className="text-red-500">*</span>
                    </label>

                    {markForm.albumNr && classesForStudent.length === 0 ? (
                      <div className="p-3 bg-yellow-600/20 border border-yellow-600 rounded text-yellow-200">
                        Ten student nie jest zapisany na żadne zajęcia.
                      </div>
                    ) : (
                      <select
                        value={markForm.classId}
                        onChange={(e) => onClassChange(e.target.value)}
                        disabled={!markForm.albumNr || classesForStudent.length === 0}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] disabled:opacity-50"
                      >
                        <option value="">Wybierz zajęcia...</option>
                        {classesForStudent.map((c) => (
                          <option key={c.classId} value={c.classId}>
                            {c.subjectName} — {c.classType} — Grupa {c.groupNr}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Pokaż nazwę przedmiotu po wybraniu klasy */}
                    {selectedClass && (
                      <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                        Przedmiot: <strong>{selectedClass.subjectName}</strong> (ID: {selectedClass.subjectId})
                      </div>
                    )}
                  </div>

                  {/* ===== KROK 3: PROWADZĄCY (filtrowany po klasie) ===== */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      3. Prowadzący <span className="text-red-500">*</span>
                    </label>

                    {markForm.classId && teachersForClass.length === 0 ? (
                      <div className="p-3 bg-yellow-600/20 border border-yellow-600 rounded text-yellow-200">
                        Brak przypisanych prowadzących do tych zajęć.
                      </div>
                    ) : (
                      <select
                        value={markForm.as_teaching_staff_id}
                        onChange={(e) => setMarkForm({ ...markForm, as_teaching_staff_id: e.target.value })}
                        disabled={!markForm.classId || teachersForClass.length === 0}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] disabled:opacity-50"
                      >
                        <option value="">Wybierz prowadzącego...</option>
                        {teachersForClass.map((t) => (
                          <option key={t.teachingStaffId} value={t.teachingStaffId}>
                            {t.name} (ID: {t.teachingStaffId})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* ===== OCENA I WAGA ===== */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Ocena <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={markForm.value}
                        onChange={(e) => setMarkForm({ ...markForm, value: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      >
                        <option value="">Wybierz...</option>
                        <option value="2.0">2.0</option>
                        <option value="3.0">3.0</option>
                        <option value="3.5">3.5</option>
                        <option value="4.0">4.0</option>
                        <option value="4.5">4.5</option>
                        <option value="5.0">5.0</option>
                        <option value="ZAL">ZAL</option>
                        <option value="NZAL">NZAL</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Waga</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={markForm.weight}
                        onChange={(e) => setMarkForm({ ...markForm, weight: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Podejście</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={markForm.attempt}
                        onChange={(e) => setMarkForm({ ...markForm, attempt: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      />
                    </div>
                  </div>

                  {/* ===== KOMENTARZ ===== */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Komentarz</label>
                    <input
                      type="text"
                      value={markForm.comment}
                      onChange={(e) => setMarkForm({ ...markForm, comment: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      placeholder="Opcjonalnie..."
                    />
                  </div>
                </div>

                {/* Przyciski */}
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleAddMark}
                    disabled={
                      !markForm.albumNr ||
                      !markForm.classId ||
                      !markForm.as_teaching_staff_id ||
                      !markForm.value
                    }
                    className="flex-1 px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FaSave /> Dodaj Ocenę
                  </button>

                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============ MODAL EDYCJI OCENY ============ */}
          {editingMark && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-md w-full">
                
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">Edytuj Ocenę #{editingMark.gradeId}</h2>
                  <button onClick={() => setEditingMark(null)}>
                    <FaTimes size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="text-sm text-[var(--color-text-secondary)]">
                    Student: <strong>{editingMark.studentName || `Album: ${editingMark.albumNr}`}</strong><br />
                    Przedmiot: <strong>{editingMark.subjectName || editingMark.subjectId}</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Ocena</label>
                      <select
                        value={markForm.value}
                        onChange={(e) => setMarkForm({ ...markForm, value: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      >
                        <option value="2.0">2.0</option>
                        <option value="3.0">3.0</option>
                        <option value="3.5">3.5</option>
                        <option value="4.0">4.0</option>
                        <option value="4.5">4.5</option>
                        <option value="5.0">5.0</option>
                        <option value="ZAL">ZAL</option>
                        <option value="NZAL">NZAL</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Waga</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={markForm.weight}
                        onChange={(e) => setMarkForm({ ...markForm, weight: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Komentarz</label>
                    <input
                      type="text"
                      value={markForm.comment}
                      onChange={(e) => setMarkForm({ ...markForm, comment: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleEditMark}
                    className="flex-1 px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg flex items-center justify-center gap-2"
                  >
                    <FaSave /> Zapisz Zmiany
                  </button>

                  <button
                    onClick={() => setEditingMark(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============ MODAL POTWIERDZENIA USUNIĘCIA ============ */}
          {deletingMarkId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-sm w-full">
                <h2 className="text-xl font-semibold mb-4">Potwierdź usunięcie</h2>
                <p className="text-[var(--color-text-secondary)] mb-6">
                  Czy na pewno chcesz usunąć ocenę #{deletingMarkId}? Tej operacji nie można cofnąć.
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleDeleteMark(deletingMarkId)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg"
                  >
                    Usuń
                  </button>
                  <button
                    onClick={() => setDeletingMarkId(null)}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg"
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