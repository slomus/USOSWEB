import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Kontakt', 
}
export default function ContactPage() {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex-1 flex flex-col">
        <main className="p-6 max-w-6xl mx-auto w-full pt-24">
          {/* Nagłówek */}
          <h1 className="text-4xl font-bold mb-8 border-b border-[var(--color-accent)] pb-4">
            Kontakt
          </h1>

          {/* Sekcja główna */}
          <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              Uniwersytet Kazimierza Wielkiego w Bydgoszczy
            </h2>

            <div className="space-y-3 text-lg">
              <p>
                <strong>Adres:</strong>
                <br />
                ul. Jana Karola Chodkiewicza 30
                <br />
                85-064 Bydgoszcz, Polska
              </p>

              <p>
                <strong>Telefon centrala:</strong>
                <br />
                +48 52 341 91 00
              </p>

              <p>
                <strong>Fax:</strong>
                <br />
                +48 52 322 45 48
              </p>

              <p>
                <strong>Adres e-mail:</strong>
                <br />
                <a
                  href="mailto:rektor@ukw.edu.pl"
                  className="text-[var(--color-accent)] underline hover:text-[var(--color-accent-hover)]"
                >
                  rektor@ukw.edu.pl
                </a>
              </p>

              <p>
                <strong>Strona internetowa:</strong>
                <br />
                <a
                  href="https://www.ukw.edu.pl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent)] underline hover:text-[var(--color-accent-hover)]"
                >
                  www.ukw.edu.pl
                </a>
              </p>
            </div>
          </section>

          {/* Sekcja działów uczelni */}
          <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
            <h2 className="text-2xl font-semibold mb-4">
              Działy uczelni i kontakt
            </h2>

            <div className="space-y-4 text-lg">
              <div>
                <h3 className="font-semibold text-xl mb-1">
                  Dział Rekrutacji i Spraw Studenckich
                </h3>
                <p>
                  ul. Chodkiewicza 30, pok. 13
                  <br />
                  Tel.: +48 52 320 67 78
                  <br />
                  E-mail:{" "}
                  <a
                    href="mailto:dsstud@ukw.edu.pl"
                    className="text-[var(--color-accent)] underline hover:text-[var(--color-accent-hover)]"
                  >
                    dsstud@ukw.edu.pl
                  </a>
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-xl mb-1">
                  Dział Współpracy Międzynarodowej
                </h3>
                <p>
                  ul. Chodkiewicza 30, budynek główny
                  <br />
                  Tel.: +48 52 341 91 00 wew. 243
                  <br />
                  E-mail:{" "}
                  <a
                    href="mailto:dwm@ukw.edu.pl"
                    className="text-[var(--color-accent)] underline hover:text-[var(--color-accent-hover)]"
                  >
                    dwm@ukw.edu.pl
                  </a>
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-xl mb-1">Biuro Prasowe</h3>
                <p>
                  Tel.: +48 52 341 91 00 wew. 255
                  <br />
                  E-mail:{" "}
                  <a
                    href="mailto:biuroprasowe@ukw.edu.pl"
                    className="text-[var(--color-accent)] underline hover:text-[var(--color-accent-hover)]"
                  >
                    biuroprasowe@ukw.edu.pl
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Sekcja mapa */}
          <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Lokalizacja uczelni</h2>
            <div className="w-full h-72 rounded-xl overflow-hidden shadow-md">
              <iframe
                title="Mapa UKW Bydgoszcz"
                src="https://www.google.com/maps?q=Uniwersytet+Kazimierza+Wielkiego+w+Bydgoszczy,+Chodkiewicza+30,+Bydgoszcz&output=embed&z=16"
                width="100%"
                height="100%"
                className="border-0"
                allowFullScreen
                loading="lazy"
              ></iframe>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
