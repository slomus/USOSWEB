"use client";

import Image from "next/image";
import Link from "next/link";
import ThemeToggleButton from "@/app/components/ThemeToggleButton";
import { FaDocker, FaReact, FaDatabase, FaServer, FaGithub, FaArrowLeft } from "react-icons/fa";
import { SiKubernetes, SiGo, SiTypescript, SiNextdotjs, SiTailwindcss, SiPostgresql, SiRedis } from "react-icons/si";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Górny pasek - taki sam jak na stronie logowania */}
      <header className="flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/logouniwersytet.png"
            alt="Logo"
            width={100}
            height={100}
          />
        </div>
        <nav className="hidden md:flex gap-6 text-sm text-[var(--color-text)] items-center">
          <span className="text-[var(--color-accent)]">o aplikacji</span>
          <a href="#">dokumentacja</a>
          <ThemeToggleButton />
        </nav>
        <div className="md:hidden text-[var(--color-accent)] text-3xl">☰</div>
      </header>

      {/* Main Content - taka sama treść jak "O nas" */}
      <main className="p-6 max-w-6xl mx-auto w-full">
        {/* Nagłówek */}
        <h1 className="text-4xl font-bold mb-8 border-b border-[var(--color-accent)] pb-4">
          O aplikacji
        </h1>

        {/* Wprowadzenie */}
        <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
          <p className="mb-4">
            Nasza aplikacja powstała, aby usprawnić życie studentów,
            wykładowców i administracji. Chcemy, aby każdy miał szybki dostęp
            do informacji i narzędzi niezbędnych w codziennym funkcjonowaniu
            na uczelni.
          </p>
          <p>
            Dzięki nowoczesnym rozwiązaniom łączymy prostotę obsługi z bogatą
            funkcjonalnością, tworząc system, który rośnie razem z potrzebami
            użytkowników.
          </p>
        </section>

        {/* Współpraca z Nokia */}
        <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
          <h2 className="text-2xl font-semibold mb-4">Współpraca z Nokia</h2>
          <p className="mb-4">
            Projekt powstał w ramach przedmiotu <strong>"Zespołowy Projekt Informatyczny"</strong> na 
            Uniwersytecie Kazimierza Wielkiego w Bydgoszczy, we współpracy z firmą <strong>Nokia</strong>.
          </p>
          <p className="mb-4">
            Opiekun projektu ze strony UKW: <strong>Marcin Kempiński</strong>
          </p>
          <p className="mb-4">
            Opiekun projektu ze strony Nokia: <strong>Fabian Bogusławski</strong>
          </p>
          <div className="bg-[var(--color-bg)] p-4 rounded-xl mt-4">
            <h3 className="font-semibold mb-3">Szkolenia przeprowadzone przez Nokia:</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <FaDocker className="text-3xl text-[var(--color-accent)]" />
                <div>
                  <p className="font-medium">Docker</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Konteneryzacja aplikacji i tworzenie obrazów</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <SiKubernetes className="text-3xl text-[var(--color-accent)]" />
                <div>
                  <p className="font-medium">Kubernetes</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Orkiestracja kontenerów i wdrażanie aplikacji</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Kim jesteśmy */}
        <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
          <h2 className="text-2xl font-semibold mb-4">Kim jesteśmy</h2>
          <p className="mb-4">
            Jesteśmy zespołem studentów uniwersytetu Kazimierza Wielkiego w
            Bydgoszczy realizujących projekt uczelniany w ramach przedmiotu
            "Zespołowy Projekt Informatyczny". Naszym celem było stworzenie
            wewnętrznego systemu komunikacji i zarządzania studiami.
          </p>
          <p className="mb-4">
            W projekcie wykorzystaliśmy nowoczesne technologie, takie jak{" "}
            <strong className="bg-gradient-to-r from-orange-500 via-indigo-500 to-green-500 text-transparent bg-clip-text">
              Next.js
            </strong>
            ,
            <strong className="bg-gradient-to-r from-orange-500 via-indigo-500 to-green-500 text-transparent bg-clip-text">
              {" "}
              TailwindCSS
            </strong>{" "}
            oraz{" "}
            <strong className="bg-gradient-to-r from-orange-500 via-indigo-500 to-green-500 text-transparent bg-clip-text">
              Docker
            </strong>
            , aby zapewnić szybkość, stabilność i skalowalność.
          </p>
          <p>
            Aplikacja powstała z myślą o tym, aby być narzędziem codziennego
            użytku dla studentów i wykładowców, a jednocześnie była przyjazna
            i intuicyjna.
          </p>
        </section>

        {/* Wykorzystane technologie */}
        <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
          <h2 className="text-2xl font-semibold mb-6">Wykorzystane technologie</h2>
          
          {/* Frontend */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-[var(--color-accent)]">Frontend</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[var(--color-bg)] p-3 rounded-xl flex items-center gap-2">
                <SiNextdotjs className="text-2xl" />
                <span className="text-sm">Next.js 15</span>
              </div>
              <div className="bg-[var(--color-bg)] p-3 rounded-xl flex items-center gap-2">
                <FaReact className="text-2xl text-cyan-500" />
                <span className="text-sm">React 19</span>
              </div>
              <div className="bg-[var(--color-bg)] p-3 rounded-xl flex items-center gap-2">
                <SiTypescript className="text-2xl text-blue-500" />
                <span className="text-sm">TypeScript</span>
              </div>
              <div className="bg-[var(--color-bg)] p-3 rounded-xl flex items-center gap-2">
                <SiTailwindcss className="text-2xl text-cyan-400" />
                <span className="text-sm">Tailwind CSS</span>
              </div>
            </div>
          </div>

          {/* Backend */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-[var(--color-accent)]">Backend</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[var(--color-bg)] p-3 rounded-xl flex items-center gap-2">
                <SiGo className="text-2xl text-cyan-600" />
                <span className="text-sm">Go (Golang)</span>
              </div>
              <div className="bg-[var(--color-bg)] p-3 rounded-xl flex items-center gap-2">
                <FaServer className="text-2xl text-[var(--color-accent)]" />
                <span className="text-sm">gRPC</span>
              </div>
              <div className="bg-[var(--color-bg)] p-3 rounded-xl flex items-center gap-2">
                <FaServer className="text-2xl text-[var(--color-accent)]" />
                <span className="text-sm">gRPC-Gateway</span>
              </div>
              <div className="bg-[var(--color-bg)] p-3 rounded-xl flex items-center gap-2">
                <FaDatabase className="text-2xl text-[var(--color-accent)]" />
                <span className="text-sm">Protocol Buffers</span>
              </div>
            </div>
          </div>

          {/* Bazy danych */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-[var(--color-accent)]">Bazy danych</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[var(--color-bg)] p-3 rounded-xl flex items-center gap-2">
                <SiPostgresql className="text-2xl text-blue-400" />
                <span className="text-sm">PostgreSQL</span>
              </div>
              <div className="bg-[var(--color-bg)] p-3 rounded-xl flex items-center gap-2">
                <SiRedis className="text-2xl text-red-500" />
                <span className="text-sm">Redis</span>
              </div>
            </div>
          </div>

          {/* DevOps */}
          <div>
            <h3 className="text-lg font-medium mb-3 text-[var(--color-accent)]">DevOps</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[var(--color-bg)] p-3 rounded-xl flex items-center gap-2">
                <FaDocker className="text-2xl text-blue-500" />
                <span className="text-sm">Docker</span>
              </div>
              <div className="bg-[var(--color-bg)] p-3 rounded-xl flex items-center gap-2">
                <SiKubernetes className="text-2xl text-blue-600" />
                <span className="text-sm">Kubernetes</span>
              </div>
              <div className="bg-[var(--color-bg)] p-3 rounded-xl flex items-center gap-2">
                <FaDocker className="text-2xl text-blue-500" />
                <span className="text-sm">Docker Compose</span>
              </div>
            </div>
          </div>
        </section>

        {/* Architektura */}
        <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
          <h2 className="text-2xl font-semibold mb-4">Architektura mikroserwisowa</h2>
          <p className="mb-4">
            Aplikacja została zaprojektowana w architekturze mikroserwisowej, gdzie każdy serwis 
            odpowiada za konkretną domenę biznesową i komunikuje się z innymi poprzez gRPC.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[var(--color-bg)] p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">API Gateway</h3>
                <span className="text-xs bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-2 py-1 rounded">:8083</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Punkt wejścia REST, routing, autoryzacja</p>
            </div>
            <div className="bg-[var(--color-bg)] p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Common Service</h3>
                <span className="text-xs bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-2 py-1 rounded">:3003</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Autoryzacja, użytkownicy, kursy, oceny, wnioski</p>
            </div>
            <div className="bg-[var(--color-bg)] p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Calendar Service</h3>
                <span className="text-xs bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-2 py-1 rounded">:3001</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Harmonogramy, zajęcia, egzaminy</p>
            </div>
            <div className="bg-[var(--color-bg)] p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Messaging Service</h3>
                <span className="text-xs bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-2 py-1 rounded">:3002</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Wysyłanie i odbieranie emaili (SMTP/IMAP)</p>
            </div>
          </div>
        </section>

        {/* Nasza misja */}
        <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
          <h2 className="text-2xl font-semibold mb-4">Nasza misja</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Ułatwiamy studentom dostęp do informacji.</li>
            <li>Zapewniamy prosty kontakt z wykładowcami.</li>
            <li>Dajemy szybki dostęp do planu zajęć i wiadomości.</li>
          </ul>
        </section>

        {/* Nasz zespół */}
        <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
          <h2 className="text-2xl font-semibold mb-6">Nasz zespół</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="bg-[var(--color-bg)] p-4 rounded-xl shadow-md text-center"
              >
                <Image
                  src={member.image}
                  alt={member.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                  width={200}
                  height={200}
                />
                <h3 className="text-lg font-bold">{member.name}</h3>
                <p className="text-[var(--color-text-secondary)]">
                  {member.role}
                </p>
                <p className="mt-2 text-sm">{member.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* GitHub */}
        <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
          <h2 className="text-2xl font-semibold mb-4">Repozytorium projektu</h2>
          <p className="mb-4">
            Kod źródłowy aplikacji jest dostępny na GitHubie:
          </p>
          <a 
            href="https://github.com/slomus/USOSWEB" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            <FaGithub className="text-xl" />
            <span>Zobacz na GitHub</span>
          </a>
        </section>

        {/* Powrót do logowania */}
        <div className="text-center mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[var(--color-accent)] hover:underline"
          >
            <FaArrowLeft />
            Wróć do strony logowania
          </Link>
        </div>
      </main>
    </div>
  );
}

const teamMembers = [
  {
    name: "Karol Kudłacz",
    role: "Backend Developer",
    description: "Dba o logikę, API i integrację z bazą danych.",
    image: "/audi80.jpg",
  },
  {
    name: "Michał Grzonkowski",
    role: "Project Manager",
    description: "Lider zespołu projektowego.",
    image: "/audi80.jpg",
  },
  {
    name: "Weronika Mazurek",
    role: "Backend Developer",
    description: "Dba o logikę, API i integrację z bazą danych.",
    image: "/audi80.jpg",
  },
  {
    name: "Agnieszka Kowalik",
    role: "Frontend Developer",
    description: "Odpowiedzialna za wygląd i interakcje w aplikacji.",
    image: "/audi80.jpg",
  },
  {
    name: "Emil Kosicki",
    role: "Frontend Developer",
    description: "Odpowiedzialny za wygląd i interakcje w aplikacji.",
    image: "/audi80.jpg",
  },
  {
    name: "Kacper Pawlak",
    role: "Frontend Developer",
    description: "Odpowiedzialny za wygląd i interakcje w aplikacji.",
    image: "/audi80.jpg",
  },
];