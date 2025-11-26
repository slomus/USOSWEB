"use client";

import { useEffect, useState } from "react";
import { FaSearch, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { toast } from "react-toastify";

type TeacherClass = {
  classId: number;
  subjectId: number;
  subjectName: string;
  subjectAlias: string;
  classType: string;
  groupNr: number;
  currentCapacity: number;
  capacity: number;
  semester: string;
  academicYear: string;
  classroom: number;
  buildingName: string;
};

type Subject = {
  subjectId: number;
  alias: string;
  name: string;
  ects: number;
  classes: TeacherClass[];
};

type SubjectDetails = {
  description: string;
  syllabus: string;
  classes: any[];
  isEnrolled: boolean;
  registrationPeriod: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

export default function TeacherSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtry
  const [searchTerm, setSearchTerm] = useState("");
  
  // Rozwinięte przedmioty
  const [expandedSubjects, setExpandedSubjects] = useState<number[]>([]);
  
  // Szczegóły przedmiotów
  const [subjectDetails, setSubjectDetails] = useState<{ [key: number]: SubjectDetails }>({});

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  const fetchTeacherClasses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/teacher/classes`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Teacher classes data:", data);
        
        // Grupuj zajęcia po subject_id
        const classesMap: { [key: number]: TeacherClass[] } = {};
        
        data.classes?.forEach((classItem: TeacherClass) => {
          if (!classesMap[classItem.subjectId]) {
            classesMap[classItem.subjectId] = [];
          }
          classesMap[classItem.subjectId].push(classItem);
        });

        // Stwórz listę przedmiotów
        const subjectsList: Subject[] = Object.entries(classesMap).map(([subjectId, classes]) => {
          const firstClass = classes[0];
          return {
            subjectId: parseInt(subjectId),
            alias: firstClass.subjectAlias,
            name: firstClass.subjectName,
            ects: 0, // Pobierzemy z /api/subjects/{id}
            classes: classes,
          };
        });

        setSubjects(subjectsList);
        setFilteredSubjects(subjectsList);
      } else {
        toast.error("Nie udało się pobrać zajęć");
      }
    } catch (error) {
      console.error("Błąd pobierania zajęć:", error);
      toast.error("Błąd pobierania zajęć");
    } finally {
      setLoading(false);
    }
  };

  // Filtrowanie przedmiotów
  useEffect(() => {
    let filtered = [...subjects];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.name?.toLowerCase().includes(term) ||
        s.alias?.toLowerCase().includes(term)
      );
    }

    setFilteredSubjects(filtered);
  }, [searchTerm, subjects]);

  // Toggle rozwinięcia przedmiotu
  const toggleSubject = async (subjectId: number) => {
    const isExpanding = !expandedSubjects.includes(subjectId);
    
    setExpandedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );

    // Pobierz szczegóły jeśli rozwijamy i jeszcze ich nie mamy
    if (isExpanding && !subjectDetails[subjectId]) {
      try {
        const response = await fetch(`${API_BASE}/api/subjects/${subjectId}`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Subject details:", data);
          
          // Zaktualizuj ECTS w subjects
          setSubjects(prev => prev.map(s => 
            s.subjectId === subjectId 
              ? { ...s, ects: data.subject?.ects || 0 }
              : s
          ));
          setFilteredSubjects(prev => prev.map(s => 
            s.subjectId === subjectId 
              ? { ...s, ects: data.subject?.ects || 0 }
              : s
          ));

          setSubjectDetails(prev => ({
            ...prev,
            [subjectId]: {
              description: data.subject?.description || "",
              syllabus: data.subject?.syllabus || "",
              classes: data.subject?.classes || [],
              isEnrolled: data.subject?.isEnrolled || false,
              registrationPeriod: data.subject?.registrationPeriod || null,
            }
          }));
        }
      } catch (error) {
        console.error("Błąd pobierania szczegółów przedmiotu:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] items-center justify-center">
        <div className="text-xl">Ładowanie przedmiotów...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="max-w-7xl mx-auto p-6 pt-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--color-accent)] mb-2 border-b border-[var(--color-accent)] pb-4">
            Moje Przedmioty
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Przedmioty, które prowadzisz w tym semestrze
          </p>
        </div>

        {/* Statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
              Przedmioty
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{subjects.length}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
              Grupy zajęciowe
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">
              {subjects.reduce((sum, s) => sum + s.classes.length, 0)}
            </p>
          </div>
        </div>

        {/* Wyszukiwanie */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-6 border border-[var(--color-accent)]">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FaSearch /> Wyszukiwanie
          </h2>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Szukaj po nazwie lub aliasie..."
            className="w-full px-4 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
          />
        </div>

        {/* Lista przedmiotów */}
        <div className="space-y-4">
          {filteredSubjects.length === 0 ? (
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-12 text-center border border-[var(--color-accent)]">
              <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-2">
                Brak przedmiotów
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                Nie prowadzisz obecnie żadnych zajęć lub nie znaleziono przedmiotów spełniających kryteria
              </p>
            </div>
          ) : (
            filteredSubjects.map((subject) => (
              <div
                key={subject.subjectId}
                className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg border border-[var(--color-accent)] overflow-hidden"
              >
                {/* Header przedmiotu */}
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-2xl font-bold text-[var(--color-accent)]">
                          {subject.name}
                        </h3>
                        <span className="px-3 py-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-full text-sm font-medium">
                          {subject.alias}
                        </span>
                        {subject.ects > 0 && (
                          <span className="px-3 py-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-full text-sm font-medium">
                            {subject.ects} ECTS
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Prowadzisz {subject.classes.length} {subject.classes.length === 1 ? 'grupę' : 'grup'} zajęciowych
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSubject(subject.subjectId)}
                        className="p-2 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded transition"
                        title={expandedSubjects.includes(subject.subjectId) ? "Zwiń" : "Rozwiń"}
                      >
                        {expandedSubjects.includes(subject.subjectId) ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rozwinięte szczegóły */}
                {expandedSubjects.includes(subject.subjectId) && (
                  <div className="px-6 pb-6 border-t border-[var(--color-accent)]/20 pt-4 space-y-4">
                    {!subjectDetails[subject.subjectId] ? (
                      <div className="bg-[var(--color-bg)] p-4 rounded-lg text-center">
                        <p className="text-sm text-[var(--color-text-secondary)]">Ładowanie szczegółów...</p>
                      </div>
                    ) : (
                      <>
                        {/* Opis */}
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">Opis przedmiotu</h4>
                          {subjectDetails[subject.subjectId].description && subjectDetails[subject.subjectId].description.trim() !== "" ? (
                            <p className="text-sm whitespace-pre-wrap">{subjectDetails[subject.subjectId].description}</p>
                          ) : (
                            <p className="text-sm text-[var(--color-text-secondary)]">Brak opisu</p>
                          )}
                        </div>

                        {/* Sylabus */}
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">Sylabus</h4>
                          {subjectDetails[subject.subjectId].syllabus && subjectDetails[subject.subjectId].syllabus.trim() !== "" ? (
                            <p className="text-sm whitespace-pre-wrap">{subjectDetails[subject.subjectId].syllabus}</p>
                          ) : (
                            <p className="text-sm text-[var(--color-text-secondary)]">Brak sylabusa</p>
                          )}
                        </div>

                        {/* Moje zajęcia */}
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-3 text-[var(--color-accent)]">
                            Moje grupy zajęciowe ({subject.classes.length})
                          </h4>
                          <div className="space-y-3">
                            {subject.classes.map((classItem) => (
                              <div key={classItem.classId} className="border border-[var(--color-accent)]/20 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className="font-semibold text-[var(--color-accent)]">
                                      {classItem.classType} - Grupa {classItem.groupNr}
                                    </span>
                                    <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                                      Studenci: {classItem.currentCapacity}/{classItem.capacity}
                                      <span className="ml-3">
                                        Sala: {classItem.classroom} ({classItem.buildingName})
                                      </span>
                                    </div>
                                    <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                                      {classItem.semester} {classItem.academicYear}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}