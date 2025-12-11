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

type ClassWithInstructors = {
  classId: number;
  subjectId: number;
  subjectName: string;
  classType: string;
  groupNr: number;
  instructors: { teachingStaffId: number; name: string }[];
  enrolledStudents: number[];
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
  const [classes, setClasses] = useState<ClassWithInstructors[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeIdSearch, setGradeIdSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMark, setEditingMark] = useState<Mark | null>(null);
  const [deletingMarkId, setDeletingMarkId] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  const [markForm, setMarkForm] = useState<NewMarkForm>({
    albumNr: "",
    subjectId: "",
    classId: "",
    value: "",
    weight: "1",
    attempt: "1",
    comment: "",
    as_teaching_staff_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const marksRes = await fetch(`${API_BASE}/api/grades?all_students=true`, {
        credentials: "include",
      });

      if (marksRes.ok) {
        const marksData = await marksRes.json();
        setMarks(marksData.grades || []);
        setFilteredMarks(marksData.grades || []);
      }

      const usersRes = await fetch(`${API_BASE}/api/auth/users`, {
        credentials: "include",
      });

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const users = usersData.users || [];

        const studentsNorm = users
          .filter((u: any) => u.role === "student")
          .map((s: any) => ({
            userId: s.userId ?? s.user_id,
            name: s.name,
            surname: s.surname,
            email: s.email,
            albumNr: Number(s.albumNr ?? s.album_nr),
          }));

        setStudents(studentsNorm);
      }

      const subjectsRes = await fetch(`${API_BASE}/api/subjects`, {
        credentials: "include",
      });

      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json();
        setSubjects(subjectsData.subjects || []);
      }

      await fetchClassesWithInstructors();
    } catch (err) {
      console.error("Błąd pobierania danych:", err);
      toast.error("Nie udało się pobrać danych");
    } finally {
      setLoading(false);
    }
  };

  const fetchClassesWithInstructors = async () => {
    const subjectsRes = await fetch(`${API_BASE}/api/subjects`, { credentials: "include" });
    if (!subjectsRes.ok) return;
    const subjectsData = await subjectsRes.json();

    const usersRes = await fetch(`${API_BASE}/api/auth/users`, { credentials: "include" });
    const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
    const users = usersData.users || [];

    const resolveTeacherId = (u: any) =>
      u.teachingStaffId ?? u.teaching_staff_id ?? u.userId ?? u.user_id ?? u.id ?? null;

    const list: ClassWithInstructors[] = [];

    for (const subject of subjectsData.subjects || []) {
      const detailsRes = await fetch(`${API_BASE}/api/subjects/${subject.subjectId}`, {
        credentials: "include",
      });
      if (!detailsRes.ok) continue;

      const detailsData = await detailsRes.json();
      const subjectClasses = detailsData.subject?.classes || [];

      for (const cls of subjectClasses) {
        const instructors: { teachingStaffId: number; name: string }[] = [];

        if (Array.isArray(cls.instructors)) {
          cls.instructors.forEach((name: string) => {
            const found = users.find((u: any) => `${u.name} ${u.surname}` === name);
            const tid = found ? resolveTeacherId(found) : 0;

            instructors.push({
              teachingStaffId: Number(tid || 0),
              name,
            });
          });
        }

        list.push({
          classId: cls.classId,
          subjectId: subject.subjectId,
          subjectName: subject.name,
          classType: cls.classType,
          groupNr: cls.groupNr,
          instructors,
          enrolledStudents: [],
        });
      }
    }

    const enrollmentsRes = await fetch(`${API_BASE}/api/enrollments?all_students=true`, {
      credentials: "include",
    });

    if (enrollmentsRes.ok) {
      const enrollmentsData = await enrollmentsRes.json();
      for (const enr of enrollmentsData.enrollments || []) {
        const album = Number(enr.albumNr ?? enr.album_nr);
        for (const ec of enr.enrolledClasses || []) {
          const classId = Number(ec.classId);
          const cls = list.find((c) => c.classId === classId);
          if (cls && album && !cls.enrolledStudents.includes(album)) {
            cls.enrolledStudents.push(album);
          }
        }
      }
    }

    setClasses(list);
  };

  useEffect(() => {
    let f = [...marks];

    if (selectedStudent) f = f.filter((m) => String(m.albumNr) === selectedStudent);
    if (selectedSubject) f = f.filter((m) => String(m.subjectId) === selectedSubject);

    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      f = f.filter(
        (m) =>
          m.subjectName?.toLowerCase().includes(t) ||
          m.value.toLowerCase().includes(t) ||
          m.comment?.toLowerCase().includes(t)
      );
    }

    if (gradeIdSearch) {
      f = f.filter((m) => m.gradeId.toString().includes(gradeIdSearch));
    }

    setFilteredMarks(f);
  }, [selectedStudent, selectedSubject, searchTerm, gradeIdSearch, marks]);

  const getClassesForSubject = () =>
    classes.filter((c) => c.subjectId.toString() === markForm.subjectId);

  const getInstructorsForClass = () => {
    const cls = classes.find((c) => c.classId.toString() === markForm.classId);
    return cls?.instructors || [];
  };

  const getStudentsForClass = () => {
    const cls = classes.find((c) => c.classId.toString() === markForm.classId);
    if (!cls) return [];

    // 🟩 OPCJA B — brak zapisanych → zwracamy pustą listę
    return cls.enrolledStudents.length === 0
      ? []
      : students.filter((s) => cls.enrolledStudents.includes(Number(s.albumNr)));
  };

  const onSubjectChange = (subjectId: string) =>
    setMarkForm({
      ...markForm,
      subjectId,
      classId: "",
      as_teaching_staff_id: "",
      albumNr: "",
    });

  const onClassChange = (classId: string) =>
    setMarkForm({
      ...markForm,
      classId,
      as_teaching_staff_id: "",
      albumNr: "",
    });
  const handleAddMark = async () => {
    if (!markForm.subjectId || !markForm.classId || !markForm.value || !markForm.as_teaching_staff_id) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    // ❗ NIE pozwalamy na dodanie oceny bez studenta (OPCJA B)
    if (!markForm.albumNr) {
      toast.error("Wybierz studenta zapisane­go na te zajęcia");
      return;
    }

    const requestBody = {
      album_nr: Number(markForm.albumNr),
      subject_id: Number(markForm.subjectId),
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
      fetchData();

    } catch (e) {
      console.error(e);
      toast.error("Błąd podczas dodawania oceny");
    }
  };

  const handleEditMark = async () => {
    if (!editingMark) return;

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
    fetchData();
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

        {/* ---------------- MAIN ---------------- */}
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
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Wszystkie oceny</h3>
              <p className="text-3xl font-bold">{marks.length}</p>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Studentów z ocenami</h3>
              <p className="text-3xl font-bold">{new Set(marks.map(m => m.albumNr)).size}</p>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Przedmiotów</h3>
              <p className="text-3xl font-bold">{new Set(marks.map(m => m.subjectId)).size}</p>
            </div>
          </div>

          {/* Filtry */}
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 mb-6 border border-[var(--color-accent)]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Search */}
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

              {/* Search by ID */}
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

              {/* Student filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                >
                  <option value="">Wszyscy</option>
                  {students.map((s) => (
                    <option key={s.userId} value={s.albumNr}>
                      {s.name} {s.surname} ({s.albumNr})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Przedmiot</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                >
                  <option value="">Wszystkie</option>
                  {subjects.map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* ---------- TABELA OCEN ---------- */}
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
                    {filteredMarks.map((mark) => (
                      <tr key={mark.gradeId} className="border-b border-[var(--color-accent)]/20 hover:bg-[var(--color-bg)]">
                        <td className="px-4 py-3">{mark.gradeId}</td>
                        <td className="px-4 py-3">{mark.studentName || `${mark.albumNr}`}</td>
                        <td className="px-4 py-3">{mark.subjectName || mark.subjectId}</td>
                        <td className="px-4 py-3">{mark.classType || "-"}</td>
                        <td className="px-4 py-3 font-bold">{mark.value}</td>
                        <td className="px-4 py-3">{mark.weight}</td>
                        <td className="px-4 py-3">{mark.addedByName || "-"}</td>
                        <td className="px-4 py-3">{mark.createdAt?.split(" ")[0]}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">

                            {/* EDYCJA */}
                            <button
                              onClick={() => {
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
                              }}
                              className="p-2 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 rounded"
                            >
                              <FaEdit />
                            </button>

                            {/* USUWANIE */}
                            <button
                              onClick={() => setDeletingMarkId(mark.gradeId)}
                              className="p-2 text-red-600 hover:bg-red-600/20 rounded"
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

          {/* --------------------------------------------- */}
          {/* -------------- MODAL DODAWANIA --------------- */}
          {/* --------------------------------------------- */}

          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">

                {/* HEADER */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">Dodaj Ocenę</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setMarkForm({
                        albumNr: "",
                        subjectId: "",
                        classId: "",
                        value: "",
                        weight: "1",
                        attempt: "1",
                        comment: "",
                        as_teaching_staff_id: "",
                      });
                    }}
                  >
                    <FaTimes size={24} />
                  </button>
                </div>

                <div className="space-y-4">

                  {/* ----------------- PRZEDMIOT ----------------- */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Przedmiot <span className="text-red-500">*</span>
                    </label>

                    <select
                      value={markForm.subjectId}
                      onChange={(e) => onSubjectChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    >
                      <option value="">Wybierz przedmiot...</option>
                      {subjects.map((s) => (
                        <option key={s.subjectId} value={s.subjectId}>
                          {s.name} ({s.alias})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ------------------ ZAJĘCIA ------------------ */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Zajęcia <span className="text-red-500">*</span>
                    </label>

                    <select
                      value={markForm.classId}
                      onChange={(e) => onClassChange(e.target.value)}
                      disabled={!markForm.subjectId}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    >
                      <option value="">Wybierz grupę...</option>

                      {getClassesForSubject().map((c) => (
                        <option key={c.classId} value={c.classId}>
                          {c.classType} — Grupa {c.groupNr} (ID: {c.classId})
                          — {c.enrolledStudents.length} studentów
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ----------------- PROWADZĄCY ---------------- */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Prowadzący <span className="text-red-500">*</span>
                    </label>

                    <select
                      value={markForm.as_teaching_staff_id}
                      onChange={(e) =>
                        setMarkForm({
                          ...markForm,
                          as_teaching_staff_id: e.target.value,
                        })
                      }
                      disabled={!markForm.classId}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    >
                      <option value="">Wybierz prowadzącego...</option>

                      {getInstructorsForClass().map((i) => (
                        <option key={i.teachingStaffId} value={i.teachingStaffId}>
                          {i.name} (ID: {i.teachingStaffId})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ------------------ STUDENT ------------------ */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Student <span className="text-red-500">*</span>
                    </label>

                    {/* ✔ OPCJA B — jeśli klasa nie ma studentów */}
                    {(() => {
                      const studentsForClass = getStudentsForClass();

                      if (markForm.classId && studentsForClass.length === 0) {
                        return (
                          <div className="p-3 bg-yellow-600/20 border border-yellow-600 rounded text-yellow-200">
                            Brak studentów zapisanych na te zajęcia.
                          </div>
                        );
                      }

                      return (
                        <select
                          value={markForm.albumNr}
                          onChange={(e) => setMarkForm({ ...markForm, albumNr: e.target.value })}
                          disabled={!markForm.classId || studentsForClass.length === 0}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                        >
                          <option value="">Wybierz studenta...</option>
                          {studentsForClass.map((s) => (
                            <option key={s.userId} value={s.albumNr}>
                              {s.name} {s.surname} (Album: {s.albumNr})
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>

                  {/* ------------- OCENA, WAGA, PODEJŚCIE -------------- */}
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  {/* ------------------ KOMENTARZ ------------------ */}
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

                {/* ---------------- PRZYCISKI ---------------- */}
                <div className="flex gap-4 mt-6">

                  <button
                    onClick={handleAddMark}
                    disabled={
                      !markForm.subjectId ||
                      !markForm.classId ||
                      !markForm.as_teaching_staff_id ||
                      !markForm.value ||
                      getStudentsForClass().length === 0 ||  // OPIS B
                      !markForm.albumNr
                    }
                    className="flex-1 px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg disabled:opacity-50"
                  >
                    <FaSave className="inline mr-2" />
                    Dodaj Ocenę
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

        </main>
      </div>
    </div>
  );
}
