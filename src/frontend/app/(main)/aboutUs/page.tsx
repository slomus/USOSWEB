import Image from "next/image";
export default function AboutPage() {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex-1 flex flex-col">
        <main className="p-6 max-w-6xl mx-auto w-full pt-24">
          {/* Nagłówek */}
          <h1 className="text-4xl font-bold mb-8 border-b border-[var(--color-accent)] pb-4">
            O nas
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

          {/* Kontakt */}
          <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Kontakt</h2>
            <p className="mb-4">
              Jeśli chcesz się z nami skontaktować, napisz do nas na adres
              e-mail:{" "}
              <a
                href="mailto:kontakt@naszaaplikacja.pl"
                className="text-[var(--color-accent)] underline hover:text-[var(--color-accent-hover)]"
              >
                kontakt@naszaaplikacja.pl
              </a>
              .
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

const teamMembers = [
  {
    name: "Karol Kudłacz ",
    role: "Backend Develope",
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
    role: "Backend Develope",
    description: "Dba o logikę, API i integrację z bazą danych.",
    image: "/audi80.jpg",
  },
  {
    name: "Agnieszka Kowalik",
    role: "Frontend Developer",
    description: "Odpowiedzialny za wygląd i interakcje w aplikacji.",
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
