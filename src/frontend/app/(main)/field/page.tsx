import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Informacje o kierunku', 
}
export default function KierunekPage() {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex-1 flex flex-col">
        <main className="p-6 max-w-6xl mx-auto w-full pt-24">
          <h1 className="text-4xl font-bold mb-8 border-b border-[var(--color-accent)] pb-4">
            Informacje o kierunku
          </h1>

          {/* Sekcja informacji o kierunku */}
          <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
            <div className="grid md:grid-cols-2 gap-6">
              <InfoRow
                label="Uniwersytet"
                value="Uniwersytet Kazimierza Wielkiego"
              />
              <InfoRow label="Kolegium" value="Kolegium III" />
              <InfoRow label="Wydział" value="Informatyki" />
              <InfoRow
                label="Adres wydziału"
                value="ul. Mikołaja Kopernika 1, Bydgoszcz"
              />
              <InfoRow label="Kierunek" value="Informatyka" />
              <InfoRow label="Rok" value="3" />
              <InfoRow label="Semestr" value="Letni (6)" />
              <InfoRow label="Tryb studiów" value="Stacjonarne" />
              <InfoRow label="Moduł" value="Sieci i systemy rozproszone" />
              <InfoRow label="Opiekun kierunku" value="dr inż. Karol Kudłaty" />
            </div>

            {/*<div className="mt-6">
              <a
                href="/plan-zajec"
                className="inline-block text-sm px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg shadow hover:bg-[var(--color-accent-hover)] transition"
              >
                Zobacz plan zajęć
              </a>
            </div>*/}
          </section>
          
          {/* Filtry wyszukiwania */}
          {/*<section>
            <h2 className="text-2xl font-semibold mb-4">
              Wyszukaj innego kierunku
            </h2>
            <div className="grid md:grid-cols-3 gap-4 bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-md mb-6">
              <input
                type="text"
                placeholder="Szukaj po nazwie kierunku"
                className="p-2 rounded-md bg-[var(--color-text-secondary)] text-white placeholder-[var(--color-text)] border border-[var(--color-text-secondary)]"
              />
              <select className="p-2 rounded-md bg-[var(--color-text-secondary)] text-white border border-[var(--color-text-secondary)]">
                <option>Wybierz kolegium</option>
                <option>Kolegium I</option>
                <option>Kolegium II</option>
              </select>
              <select className="p-2 rounded-md bg-[var(--color-text-secondary)] text-white border border-[var(--color-text-secondary)]">
                <option>Wybierz wydział</option>
                <option>Wydział Informatyki</option>
              </select>
              <select className="p-2 rounded-md bg-[var(--color-text-secondary)] text-white border border-[var(--color-text-secondary)]">
                <option>Tryb studiów</option>
                <option>Stacjonarne</option>
                <option>Niestacjonarne</option>
              </select>
              <input
                type="text"
                placeholder="Moduł / specjalność"
                className="p-2 rounded-md bg-[var(--color-text-secondary)] text-white placeholder-[var(--color-text)] border border-[var(--color-text-secondary)]"
              />
            </div>

            <div className="mt-2">
              <a
                href="/plan-zajec?filter=on"
                className="inline-block px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition"
              >
                Wyszukaj
              </a>
            </div>
          </section>*/}
          
        </main>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">
        {label}
      </p>
      <p className="text-base font-semibold text-[var(--color-text)]">
        {value}
      </p>
    </div>
  );
}