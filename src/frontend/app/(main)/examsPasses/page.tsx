export default function ExamsAndGradesPage() {
  const zaliczenia = [
    {
      kierunek: "Informatyka [SP-INF]",
      etap: "1 rok, 1 sem., informatyka [SP-INF-11]",
      cykl: "2022Z",
      dataZakonczenia: "2023-02-21",
      status: "A - zaliczony automatycznie",
    },
    {
      kierunek: "Informatyka [SP-INF]",
      etap: "1 rok, 2 sem., informatyka [SP-INF-12]",
      cykl: "2022L",
      dataZakonczenia: "2023-09-30",
      status: "A - zaliczony automatycznie",
    },
    {
      kierunek:
        "2 rok, 3 sem., informatyka, moduł: programowanie aplikacji biznesowych [SP-INF-mPB-23]",
      cykl: "2023Z",
      dataZakonczenia: "2024-02-25",
      status: "A - zaliczony automatycznie",
    },
    {
      kierunek:
        "2 rok, 4 sem., informatyka, moduł: programowanie aplikacji biznesowych [SP-INF-mPB-24]",
      cykl: "2023L",
      dataZakonczenia: "2024-09-30",
      status: "A - zaliczony automatycznie",
    },
  ];

  const egzaminy = [
    {
      przedmiot: "Bazy danych",
      data: "2024-01-28",
      ocena: "4.5",
      prowadzacy: "dr inż. Jan Nowak",
      typ: "Egzamin",
    },
    {
      przedmiot: "Programowanie w Pythonie",
      data: "2024-02-02",
      ocena: "5.0",
      prowadzacy: "mgr Anna Kowalska",
      typ: "Zaliczenie",
    },
    {
      przedmiot: "Sieci komputerowe",
      data: "2024-06-15",
      ocena: "3.5",
      prowadzacy: "dr Piotr Malinowski",
      typ: "Egzamin poprawkowy",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex-1 flex flex-col">
        <main className="p-6 max-w-6xl mx-auto w-full pt-24">
          {/* Nagłówek strony */}
          <h1 className="text-4xl font-bold mb-8 border-b border-[var(--color-accent)] pb-4">
            Zaliczenia i Egzaminy
          </h1>

          {/* Sekcja Zaliczenia Etapów */}
          <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
            <h2 className="text-2xl font-semibold mb-6">
              Zaliczenia etapów studiów
            </h2>
            <div className="space-y-4">
              {zaliczenia.map((z, i) => (
                <div
                  key={i}
                  className="border border-[var(--color-accent)] rounded-xl p-4 bg-[var(--color-bg)] shadow-md"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{z.etap}</h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {z.kierunek}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p>
                      <strong>Cykl:</strong> {z.cykl}
                    </p>
                    <p>
                      <strong>Data zakończenia:</strong> {z.dataZakonczenia}
                    </p>
                    <p>
                      <strong>Status zaliczenia:</strong> {z.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sekcja Egzaminy */}
          <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
            <h2 className="text-2xl font-semibold mb-6">Historia egzaminów</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-bg)] border-b border-[var(--color-accent)]">
                    <th className="p-3">Przedmiot</th>
                    <th className="p-3">Typ</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Ocena</th>
                    <th className="p-3">Prowadzący</th>
                  </tr>
                </thead>
                <tbody>
                  {egzaminy.map((e, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition"
                    >
                      <td className="p-3">{e.przedmiot}</td>
                      <td className="p-3">{e.typ}</td>
                      <td className="p-3">{e.data}</td>
                      <td className="p-3 font-semibold">{e.ocena}</td>
                      <td className="p-3">{e.prowadzacy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
