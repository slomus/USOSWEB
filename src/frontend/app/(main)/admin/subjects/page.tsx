"use client";

import { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaSearch, FaFilter, FaChevronDown, FaChevronRight, FaBook } from "react-icons/fa";

type Subject = {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  ects: number;
  semester: string;
  hoursLecture: number;
  hoursLab: number;
  hoursProject: number;
  description: string;
  literature: string[];
  teachingMethods: string[];
  learningOutcomes: string[];
  assessmentMethods: string[];
  prerequisites: string[];
  active: boolean;
};

type SubjectForm = {
  subjectName: string;
  subjectCode: string;
  ects: string;
  semester: string;
  hoursLecture: string;
  hoursLab: string;
  hoursProject: string;
  description: string;
  literature: string;
  teachingMethods: string;
  learningOutcomes: string;
  assessmentMethods: string;
  prerequisites: string;
  active: boolean;
};

// Fake data - ponieważ backend nie ma endpointów
const FAKE_SUBJECTS: Subject[] = [
  {
    subjectId: 1,
    subjectName: "Problemy społeczne i zawodowe informatyki",
    subjectCode: "I300-ar47PSZI-SP",
    ects: 2,
    semester: "zimowy 2018/19",
    hoursLecture: 15,
    hoursLab: 0,
    hoursProject: 0,
    description: "Przedmiot obejmuje problematykę społecznych i zawodowych aspektów informatyki, w tym etykę zawodową, prawo autorskie i ochronę danych osobowych.",
    literature: [
      "Blanchard K., Peale N. V., Etyka biznesu, Warszawa, 2010",
      "Beck O.E., Internet Prawo informatyczne problemy teorii i praktyki e-ustaw, Warszawa, 2012",
      "Ustawa o Prawie Autorskim",
      "Ustawa o ochronie danych osobowych",
      "Ustawa o Prawo Prasowe",
      "Gliński K., Łybacka L., Prawa autorskie i pokrewne. Wzory Pism, Prawo Prasowe, Warszawa, 2012",
      "du Val M., Prawo prasowe, Warszawa, 2008"
    ],
    teachingMethods: [
      "wykład konwersatoryjny",
      "wykład z naką problemowym"
    ],
    learningOutcomes: [
      "Ma podstawową wiedzę nt. kodeksów etycznych dotyczących informatyki oraz zasady etyki",
      "Ma pogłębioną wiedzę z przedmiotów ekonomicznych i oraz podstawowe zasadyHttpException i higeny pracy",
      "Ma pogłębioną wiedzę z zakresu patentów Ustawy Prawo autorskie i prawie pokrewne oraz ustawy O ochronie danych osobowych",
      "U1: potrafi pogłębiać informację z literatury, baz danych i innych źródeł potrafi magaznić uzpełniane kwerendy bibliograficzne w zakresie problematyki społecznej i zawodowej uzasadnienie",
      "U2: Potrafi – przy formułowaniu i rozwiązywaniu zadań informatycznych – dostrzegać ich aspekty społeczne, ekonomiczne i prawne"
    ],
    assessmentMethods: [
      "Egzamin pisemny i/lub ustny",
      "Projekt/referat/prezentacja"
    ],
    prerequisites: [],
    active: true
  },
  {
    subjectId: 2,
    subjectName: "Programowanie obiektowe",
    subjectCode: "I300-PO-SP",
    ects: 6,
    semester: "zimowy 2024/25",
    hoursLecture: 30,
    hoursLab: 30,
    hoursProject: 0,
    description: "Przedmiot wprowadza do programowania obiektowego, omawiając podstawowe koncepcje takie jak klasy, obiekty, dziedziczenie, polimorfizm i enkapsulacja.",
    literature: [
      "Eckel B., Thinking in Java, Prentice Hall, 2006",
      "Horstmann C., Core Java Volume I - Fundamentals, Prentice Hall, 2018",
      "Bloch J., Effective Java, Addison-Wesley, 2018"
    ],
    teachingMethods: [
      "wykład tradycyjny",
      "laboratorium komputerowe",
      "projekt zespołowy"
    ],
    learningOutcomes: [
      "Zna podstawowe paradygmaty programowania obiektowego",
      "Potrafi zaprojektować i zaimplementować hierarchię klas",
      "Umie zastosować wzorce projektowe w praktyce",
      "Potrafi debugować i testować kod obiektowy"
    ],
    assessmentMethods: [
      "Egzamin praktyczny",
      "Projekt zaliczeniowy",
      "Kolokwia cząstkowe"
    ],
    prerequisites: [
      "Podstawy programowania",
      "Algorytmy i struktury danych"
    ],
    active: true
  },
  {
    subjectId: 3,
    subjectName: "Bazy danych",
    subjectCode: "I300-BD-SP",
    ects: 5,
    semester: "letni 2024/25",
    hoursLecture: 30,
    hoursLab: 30,
    hoursProject: 15,
    description: "Przedmiot obejmuje teorię i praktykę projektowania oraz implementacji baz danych, w tym modelowanie danych, SQL, normalizację i optymalizację zapytań.",
    literature: [
      "Elmasri R., Navathe S., Fundamentals of Database Systems, Pearson, 2015",
      "Date C.J., An Introduction to Database Systems, Addison-Wesley, 2003",
      "Silberschatz A., Database System Concepts, McGraw-Hill, 2019"
    ],
    teachingMethods: [
      "wykład multimedialny",
      "laboratorium komputerowe",
      "projekt praktyczny"
    ],
    learningOutcomes: [
      "Potrafi zaprojektować model relacyjnej bazy danych",
      "Zna zasady normalizacji baz danych",
      "Umie tworzyć złożone zapytania SQL",
      "Potrafi zoptymalizować wydajność bazy danych"
    ],
    assessmentMethods: [
      "Egzamin pisemny",
      "Projekt systemu bazodanowego",
      "Zaliczenie laboratorium"
    ],
    prerequisites: [
      "Matematyka dyskretna",
      "Podstawy programowania"
    ],
    active: true
  },
  {
    subjectId: 4,
    subjectName: "Sieci komputerowe",
    subjectCode: "I300-SK-SP",
    ects: 4,
    semester: "zimowy 2024/25",
    hoursLecture: 30,
    hoursLab: 15,
    hoursProject: 0,
    description: "Podstawy sieci komputerowych, protokoły komunikacyjne, model OSI i TCP/IP, routing, switching oraz bezpieczeństwo sieci.",
    literature: [
      "Tanenbaum A., Wetherall D., Computer Networks, Pearson, 2010",
      "Kurose J., Ross K., Computer Networking, Pearson, 2016",
      "Stallings W., Data and Computer Communications, Pearson, 2013"
    ],
    teachingMethods: [
      "wykład z demonstracją",
      "laboratorium sieciowe",
      "case study"
    ],
    learningOutcomes: [
      "Rozumie działanie protokołów sieciowych",
      "Potrafi skonfigurować podstawową sieć LAN",
      "Zna zasady routingu i switchingu",
      "Umie diagnozować problemy sieciowe"
    ],
    assessmentMethods: [
      "Egzamin teoretyczny",
      "Testy praktyczne",
      "Sprawozdania z laboratoriów"
    ],
    prerequisites: [
      "Podstawy informatyki"
    ],
    active: true
  },
  {
    subjectId: 5,
    subjectName: "Inżynieria oprogramowania",
    subjectCode: "I300-IO-SP",
    ects: 5,
    semester: "letni 2024/25",
    hoursLecture: 30,
    hoursLab: 0,
    hoursProject: 30,
    description: "Metodyki wytwarzania oprogramowania, analiza wymagań, projektowanie systemów, testowanie, zarządzanie projektem informatycznym.",
    literature: [
      "Sommerville I., Software Engineering, Pearson, 2015",
      "Pressman R., Software Engineering: A Practitioner's Approach, McGraw-Hill, 2014",
      "Fowler M., UML Distilled, Addison-Wesley, 2003"
    ],
    teachingMethods: [
      "wykład problemowy",
      "projekt zespołowy",
      "metody zwinne (Scrum)"
    ],
    learningOutcomes: [
      "Potrafi przeprowadzić analizę wymagań systemu",
      "Zna metodyki wytwarzania oprogramowania",
      "Umie zaprojektować architekturę systemu",
      "Potrafi zarządzać projektem informatycznym"
    ],
    assessmentMethods: [
      "Projekt zespołowy",
      "Prezentacja wyników",
      "Dokumentacja techniczna"
    ],
    prerequisites: [
      "Programowanie obiektowe",
      "Bazy danych"
    ],
    active: true
  },
  {
    subjectId: 6,
    subjectName: "Algorytmy i struktury danych",
    subjectCode: "I300-ASD-SP",
    ects: 6,
    semester: "zimowy 2023/24",
    hoursLecture: 30,
    hoursLab: 30,
    hoursProject: 0,
    description: "Podstawowe algorytmy i struktury danych, ich implementacja i analiza złożoności obliczeniowej.",
    literature: [
      "Cormen T., Introduction to Algorithms, MIT Press, 2009",
      "Sedgewick R., Algorithms, Addison-Wesley, 2011",
      "Knuth D., The Art of Computer Programming, Addison-Wesley, 1997"
    ],
    teachingMethods: [
      "wykład tradycyjny",
      "laboratorium programistyczne",
      "rozwiązywanie problemów"
    ],
    learningOutcomes: [
      "Zna podstawowe struktury danych i ich zastosowania",
      "Potrafi analizować złożoność algorytmów",
      "Umie implementować efektywne algorytmy",
      "Rozumie rekurencję i programowanie dynamiczne"
    ],
    assessmentMethods: [
      "Egzamin praktyczny i teoretyczny",
      "Kolokwia",
      "Zadania programistyczne"
    ],
    prerequisites: [
      "Podstawy programowania",
      "Matematyka dyskretna"
    ],
    active: false
  }
];

export default function AdminSubjectsManagementPage() {
  const [subjects, setSubjects] = useState<Subject[]>(FAKE_SUBJECTS);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>(FAKE_SUBJECTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Filtry
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Rozwinięte przedmioty
  const [expandedSubjects, setExpandedSubjects] = useState<number[]>([]);
  
  // Modalne okna
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubjectId, setDeletingSubjectId] = useState<number | null>(null);
  
  // Formularz
  const [subjectForm, setSubjectForm] = useState<SubjectForm>({
    subjectName: "",
    subjectCode: "",
    ects: "",
    semester: "",
    hoursLecture: "",
    hoursLab: "",
    hoursProject: "",
    description: "",
    literature: "",
    teachingMethods: "",
    learningOutcomes: "",
    assessmentMethods: "",
    prerequisites: "",
    active: true,
  });

  // Filtrowanie przedmiotów
  useEffect(() => {
    let filtered = [...subjects];

    if (selectedSemester) {
      filtered = filtered.filter(s => s.semester === selectedSemester);
    }

    if (selectedStatus) {
      const isActive = selectedStatus === "active";
      filtered = filtered.filter(s => s.active === isActive);
    }

    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.subjectCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSubjects(filtered);
  }, [selectedSemester, selectedStatus, searchTerm, subjects]);

  // Toggle rozwinięcia przedmiotu
  const toggleSubject = (subjectId: number) => {
    setExpandedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  // Dodawanie nowego przedmiotu
  const handleAddSubject = () => {
    if (!subjectForm.subjectName || !subjectForm.subjectCode) {
      alert("Wypełnij nazwę i kod przedmiotu");
      return;
    }

    const newSubject: Subject = {
      subjectId: Math.max(...subjects.map(s => s.subjectId)) + 1,
      subjectName: subjectForm.subjectName,
      subjectCode: subjectForm.subjectCode,
      ects: parseInt(subjectForm.ects) || 0,
      semester: subjectForm.semester,
      hoursLecture: parseInt(subjectForm.hoursLecture) || 0,
      hoursLab: parseInt(subjectForm.hoursLab) || 0,
      hoursProject: parseInt(subjectForm.hoursProject) || 0,
      description: subjectForm.description,
      literature: subjectForm.literature.split('\n').filter(l => l.trim()),
      teachingMethods: subjectForm.teachingMethods.split('\n').filter(m => m.trim()),
      learningOutcomes: subjectForm.learningOutcomes.split('\n').filter(o => o.trim()),
      assessmentMethods: subjectForm.assessmentMethods.split('\n').filter(a => a.trim()),
      prerequisites: subjectForm.prerequisites.split('\n').filter(p => p.trim()),
      active: subjectForm.active,
    };

    setSubjects([...subjects, newSubject]);
    alert("Przedmiot dodany pomyślnie!");
    setShowAddModal(false);
    resetForm();
  };

  // Edycja przedmiotu
  const handleEditSubject = () => {
    if (!editingSubject) return;

    const updatedSubject: Subject = {
      ...editingSubject,
      subjectName: subjectForm.subjectName,
      subjectCode: subjectForm.subjectCode,
      ects: parseInt(subjectForm.ects) || 0,
      semester: subjectForm.semester,
      hoursLecture: parseInt(subjectForm.hoursLecture) || 0,
      hoursLab: parseInt(subjectForm.hoursLab) || 0,
      hoursProject: parseInt(subjectForm.hoursProject) || 0,
      description: subjectForm.description,
      literature: subjectForm.literature.split('\n').filter(l => l.trim()),
      teachingMethods: subjectForm.teachingMethods.split('\n').filter(m => m.trim()),
      learningOutcomes: subjectForm.learningOutcomes.split('\n').filter(o => o.trim()),
      assessmentMethods: subjectForm.assessmentMethods.split('\n').filter(a => a.trim()),
      prerequisites: subjectForm.prerequisites.split('\n').filter(p => p.trim()),
      active: subjectForm.active,
    };

    setSubjects(subjects.map(s => s.subjectId === editingSubject.subjectId ? updatedSubject : s));
    alert("Przedmiot zaktualizowany pomyślnie!");
    setEditingSubject(null);
    resetForm();
  };

  // Usuwanie przedmiotu
  const handleDeleteSubject = (subjectId: number) => {
    if (!confirm("Czy na pewno chcesz usunąć ten przedmiot? Tej operacji nie można cofnąć.")) return;

    setSubjects(subjects.filter(s => s.subjectId !== subjectId));
    alert("Przedmiot usunięty pomyślnie!");
  };

  const resetForm = () => {
    setSubjectForm({
      subjectName: "",
      subjectCode: "",
      ects: "",
      semester: "",
      hoursLecture: "",
      hoursLab: "",
      hoursProject: "",
      description: "",
      literature: "",
      teachingMethods: "",
      learningOutcomes: "",
      assessmentMethods: "",
      prerequisites: "",
      active: true,
    });
  };

  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      ects: subject.ects.toString(),
      semester: subject.semester,
      hoursLecture: subject.hoursLecture.toString(),
      hoursLab: subject.hoursLab.toString(),
      hoursProject: subject.hoursProject.toString(),
      description: subject.description,
      literature: subject.literature.join('\n'),
      teachingMethods: subject.teachingMethods.join('\n'),
      learningOutcomes: subject.learningOutcomes.join('\n'),
      assessmentMethods: subject.assessmentMethods.join('\n'),
      prerequisites: subject.prerequisites.join('\n'),
      active: subject.active,
    });
  };

  const uniqueSemesters = Array.from(new Set(subjects.map(s => s.semester)));
  const activeCount = subjects.filter(s => s.active).length;
  const inactiveCount = subjects.filter(s => !s.active).length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <div className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-accent)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-accent)] mb-2">
              Zarządzanie Przedmiotami
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Panel administratora - dodawaj, edytuj i usuwaj przedmioty w systemie
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors font-semibold"
          >
            <FaPlus /> Dodaj Przedmiot
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
                <label className="block text-sm font-medium mb-2">Semestr</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="">Wszystkie semestry</option>
                  {uniqueSemesters.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="">Wszystkie statusy</option>
                  <option value="active">Aktywny</option>
                  <option value="inactive">Nieaktywny</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Szukaj</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nazwa, kod przedmiotu..."
                    className="w-full px-3 py-2 pl-10 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                  <FaSearch className="absolute left-3 top-3 text-[var(--color-text-secondary)]" />
                </div>
              </div>
            </div>
          )}

          {(selectedSemester || selectedStatus || searchTerm) && (
            <div className="mt-4 pt-4 border-t border-[var(--color-accent)]">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Znaleziono: <strong className="text-[var(--color-accent)]">{filteredSubjects.length}</strong> przedmiotów
                <button
                  onClick={() => {
                    setSelectedSemester("");
                    setSelectedStatus("");
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
              Wszystkie Przedmioty
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{subjects.length}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
              <FaBook className="text-[var(--color-accent)]" /> Aktywne
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{activeCount}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Nieaktywne
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{inactiveCount}</p>
          </div>
        </div>

        {/* Lista przedmiotów */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg overflow-hidden">
          <div className="bg-[var(--color-accent)] text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Lista Przedmiotów</h2>
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-2">
                Brak przedmiotów
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                Nie znaleziono żadnych przedmiotów spełniających kryteria wyszukiwania
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-accent)]/20">
              {filteredSubjects.map((subject) => (
                <div key={subject.subjectId} className="bg-[var(--color-bg-secondary)]">
                  {/* Nagłówek przedmiotu */}
                  <div className="p-6 hover:bg-[var(--color-bg)] transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            onClick={() => toggleSubject(subject.subjectId)}
                            className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                          >
                            {expandedSubjects.includes(subject.subjectId) ? (
                              <FaChevronDown size={20} />
                            ) : (
                              <FaChevronRight size={20} />
                            )}
                          </button>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold">{subject.subjectName}</h3>
                            <p className="text-sm text-[var(--color-text-secondary)]">{subject.subjectCode}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            subject.active 
                              ? "bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)]"
                              : "bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)]"
                          }`}>
                            {subject.active ? "Aktywny" : "Nieaktywny"}
                          </span>
                        </div>
                        <div className="ml-8 text-sm text-[var(--color-text-secondary)] space-y-1">
                          <p><strong>Semestr:</strong> {subject.semester}</p>
                          <p><strong>ECTS:</strong> {subject.ects} | <strong>Wykład:</strong> {subject.hoursLecture}h | <strong>Lab:</strong> {subject.hoursLab}h | <strong>Projekt:</strong> {subject.hoursProject}h</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => openEditModal(subject)}
                          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] transition-colors text-sm flex items-center gap-2"
                        >
                          <FaEdit /> Edytuj
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(subject.subjectId)}
                          disabled={deletingSubjectId === subject.subjectId}
                          className="px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded hover:bg-[var(--color-accent)] hover:text-white transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          <FaTrash /> Usuń
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Rozwinięte szczegóły */}
                  {expandedSubjects.includes(subject.subjectId) && (
                    <div className="px-6 pb-6 ml-8 space-y-4 border-t border-[var(--color-accent)]/20 pt-4">
                      {/* Opis */}
                      {subject.description && (
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">Opis przedmiotu</h4>
                          <p className="text-sm">{subject.description}</p>
                        </div>
                      )}

                      {/* Literatura */}
                      {subject.literature.length > 0 && (
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">Literatura</h4>
                          <ol className="text-sm list-decimal list-inside space-y-1">
                            {subject.literature.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Metody dydaktyczne */}
                      {subject.teachingMethods.length > 0 && (
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">Metody dydaktyczne</h4>
                          <ul className="text-sm list-disc list-inside space-y-1">
                            {subject.teachingMethods.map((method, idx) => (
                              <li key={idx}>{method}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Efekty uczenia się */}
                      {subject.learningOutcomes.length > 0 && (
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">Efekty uczenia się</h4>
                          <ul className="text-sm space-y-2">
                            {subject.learningOutcomes.map((outcome, idx) => (
                              <li key={idx} className="pl-4 border-l-2 border-[var(--color-accent)]">{outcome}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Metody oceny */}
                      {subject.assessmentMethods.length > 0 && (
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">Metody oceny</h4>
                          <ul className="text-sm list-disc list-inside space-y-1">
                            {subject.assessmentMethods.map((method, idx) => (
                              <li key={idx}>{method}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Wymagania wstępne */}
                      {subject.prerequisites.length > 0 && (
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">Wymagania wstępne</h4>
                          <ul className="text-sm list-disc list-inside space-y-1">
                            {subject.prerequisites.map((prereq, idx) => (
                              <li key={idx}>{prereq}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal dodawania/edycji */}
      {(showAddModal || editingSubject) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[var(--color-accent)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-[var(--color-accent)]">
                {editingSubject ? "Edytuj Przedmiot" : "Dodaj Nowy Przedmiot"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSubject(null);
                  resetForm();
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Dane podstawowe */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nazwa przedmiotu <span className="text-[var(--color-accent)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={subjectForm.subjectName}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subjectName: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Kod przedmiotu <span className="text-[var(--color-accent)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={subjectForm.subjectCode}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subjectCode: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Punkty ECTS</label>
                  <input
                    type="number"
                    value={subjectForm.ects}
                    onChange={(e) => setSubjectForm({ ...subjectForm, ects: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Semestr</label>
                  <input
                    type="text"
                    value={subjectForm.semester}
                    onChange={(e) => setSubjectForm({ ...subjectForm, semester: e.target.value })}
                    placeholder="np. zimowy 2024/25"
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Godziny wykładowe</label>
                  <input
                    type="number"
                    value={subjectForm.hoursLecture}
                    onChange={(e) => setSubjectForm({ ...subjectForm, hoursLecture: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Godziny laboratoryjne</label>
                  <input
                    type="number"
                    value={subjectForm.hoursLab}
                    onChange={(e) => setSubjectForm({ ...subjectForm, hoursLab: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Godziny projektowe</label>
                  <input
                    type="number"
                    value={subjectForm.hoursProject}
                    onChange={(e) => setSubjectForm({ ...subjectForm, hoursProject: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Opis przedmiotu</label>
                <textarea
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] resize-vertical"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Literatura (każda pozycja w nowej linii)</label>
                <textarea
                  value={subjectForm.literature}
                  onChange={(e) => setSubjectForm({ ...subjectForm, literature: e.target.value })}
                  rows={4}
                  placeholder="Autor, Tytuł, Wydawnictwo, Rok&#10;Następna pozycja..."
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] resize-vertical"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Metody dydaktyczne (każda w nowej linii)</label>
                <textarea
                  value={subjectForm.teachingMethods}
                  onChange={(e) => setSubjectForm({ ...subjectForm, teachingMethods: e.target.value })}
                  rows={3}
                  placeholder="wykład tradycyjny&#10;laboratorium komputerowe&#10;projekt zespołowy"
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] resize-vertical"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Efekty uczenia się (każdy w nowej linii)</label>
                <textarea
                  value={subjectForm.learningOutcomes}
                  onChange={(e) => setSubjectForm({ ...subjectForm, learningOutcomes: e.target.value })}
                  rows={4}
                  placeholder="Student zna...&#10;Student potrafi...&#10;Student rozumie..."
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] resize-vertical"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Metody oceny (każda w nowej linii)</label>
                <textarea
                  value={subjectForm.assessmentMethods}
                  onChange={(e) => setSubjectForm({ ...subjectForm, assessmentMethods: e.target.value })}
                  rows={3}
                  placeholder="Egzamin pisemny&#10;Projekt zaliczeniowy&#10;Kolokwia"
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] resize-vertical"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Wymagania wstępne (każde w nowej linii)</label>
                <textarea
                  value={subjectForm.prerequisites}
                  onChange={(e) => setSubjectForm({ ...subjectForm, prerequisites: e.target.value })}
                  rows={2}
                  placeholder="Podstawy programowania&#10;Matematyka dyskretna"
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] resize-vertical"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subjectForm.active}
                  onChange={(e) => setSubjectForm({ ...subjectForm, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium">Przedmiot aktywny</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-accent)]">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSubject(null);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={editingSubject ? handleEditSubject : handleAddSubject}
                  className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-2"
                >
                  <FaSave /> {editingSubject ? "Zapisz Zmiany" : "Dodaj Przedmiot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}