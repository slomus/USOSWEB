"use client";

import { useEffect, useState } from "react";
import {
  FaSearch,
  FaFilter,
  FaChevronDown,
  FaChevronRight,
  FaBook,
} from "react-icons/fa";

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

export default function LecturerSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>(FAKE_SUBJECTS);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>(FAKE_SUBJECTS);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<number[]>([]);

  // Filtracja
  useEffect(() => {
    let filtered = [...subjects];
    if (selectedSemester) filtered = filtered.filter(s => s.semester === selectedSemester);
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

  const toggleSubject = (subjectId: number) => {
    setExpandedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const uniqueSemesters = Array.from(new Set(subjects.map(s => s.semester)));
  const activeCount = subjects.filter(s => s.active).length;
  const inactiveCount = subjects.filter(s => !s.active).length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <div className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-accent)] px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-[var(--color-accent)] mb-2">
            Przedmioty
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Panel wykładowcy – przeglądaj listę przedmiotów i ich szczegóły
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
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
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)]"
                >
                  <option value="">Wszystkie semestry</option>
                  {uniqueSemesters.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)]"
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
                    placeholder="Nazwa lub kod przedmiotu..."
                    className="w-full px-3 py-2 pl-10 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)]"
                  />
                  <FaSearch className="absolute left-3 top-3 text-[var(--color-text-secondary)]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Wszystkie Przedmioty
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">
              {subjects.length}
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
              <FaBook className="text-[var(--color-accent)]" /> Aktywne
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">
              {activeCount}
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Nieaktywne
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">
              {inactiveCount}
            </p>
          </div>
        </div>

        {/* Lista przedmiotów */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg overflow-hidden">
          <div className="bg-[var(--color-accent)] text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Lista Przedmiotów</h2>
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="px-6 py-12 text-center text-[var(--color-text-secondary)]">
              Brak przedmiotów spełniających kryteria.
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-accent)]/20">
              {filteredSubjects.map((subject) => (
                <div key={subject.subjectId}>
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
                          <div>
                            <h3 className="text-lg font-semibold">{subject.subjectName}</h3>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              {subject.subjectCode}
                            </p>
                          </div>
                          <span className="px-3 py-1 border border-[var(--color-accent)] rounded-full text-sm font-medium">
                            {subject.active ? "Aktywny" : "Nieaktywny"}
                          </span>
                        </div>
                        <div className="ml-8 text-sm text-[var(--color-text-secondary)] space-y-1">
                          <p>
                            <strong>Semestr:</strong> {subject.semester}
                          </p>
                          <p>
                            <strong>ECTS:</strong> {subject.ects} |{" "}
                            <strong>Wykład:</strong> {subject.hoursLecture}h |{" "}
                            <strong>Lab:</strong> {subject.hoursLab}h |{" "}
                            <strong>Projekt:</strong> {subject.hoursProject}h
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedSubjects.includes(subject.subjectId) && (
                    <div className="px-6 pb-6 ml-8 space-y-4 border-t border-[var(--color-accent)]/20 pt-4">
                      {/* Opis */}
                      {subject.description && (
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">
                            Opis przedmiotu
                          </h4>
                          <p className="text-sm">{subject.description}</p>
                        </div>
                      )}

                      {/* Literatura */}
                      {subject.literature.length > 0 && (
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">
                            Literatura
                          </h4>
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
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">
                            Metody dydaktyczne
                          </h4>
                          <ul className="text-sm list-disc list-inside space-y-1">
                            {subject.teachingMethods.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Efekty uczenia się */}
                      {subject.learningOutcomes.length > 0 && (
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">
                            Efekty uczenia się
                          </h4>
                          <ul className="text-sm space-y-2">
                            {subject.learningOutcomes.map((o, i) => (
                              <li
                                key={i}
                                className="pl-4 border-l-2 border-[var(--color-accent)]"
                              >
                                {o}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Metody oceny */}
                      {subject.assessmentMethods.length > 0 && (
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">
                            Metody oceny
                          </h4>
                          <ul className="text-sm list-disc list-inside space-y-1">
                            {subject.assessmentMethods.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Wymagania wstępne */}
                      {subject.prerequisites.length > 0 && (
                        <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-[var(--color-accent)]">
                            Wymagania wstępne
                          </h4>
                          <ul className="text-sm list-disc list-inside space-y-1">
                            {subject.prerequisites.map((p, i) => (
                              <li key={i}>{p}</li>
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
    </div>
  );
}
