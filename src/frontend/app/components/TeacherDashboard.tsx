// app/components/TeacherDashboard.tsx

export default function LecturerDashboard() {
  return (
    <main className="min-h-screen px-6 py-6 text-[var(--color-text)] bg-[var(--color-bg)]">
      {/* Główna siatka */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Lewa i środkowa kolumna – duży widok planu zajęć */}
        <div className="lg:col-span-2 bg-[var(--color-bg)] p-8 rounded-xl shadow-md h-[70vh] flex flex-col justify-center items-center border border-[#327f7a]">
          <div className="text-[var(--color-text)] text-center w-full h-full flex flex-col justify-center items-center">
            <p className="text-lg mb-4 font-semibold">
              Plan zajęć / Kalendarz wykładowcy
            </p>
            <div className="w-full h-full bg-[rgba(50,127,122,0.1)] rounded-xl flex justify-center items-center border border-[#327f7a]">
              <p className="text-sm italic text-[var(--color-text)]">
                [Tutaj zostanie wstawiony komponent kalendarza wykładowcy]
              </p>
            </div>
          </div>
        </div>

        {/* Prawa kolumna – informacje o zajęciach */}
        <div className="bg-[var(--color-bg)] p-6 rounded-xl shadow-md flex flex-col justify-start gap-6 border border-[#327f7a]">
          {/* Aktualne zajęcia */}
          <div>
            <p className="mb-2 text-sm border-b border-[#327f7a] pb-2 font-medium">
              Aktualne zajęcia:
            </p>
            <div className="bg-teal-700 text-white px-4 py-2 rounded-lg inline-block text-sm">
              Systemy rozproszone
            </div>
          </div>

          {/* Następne zajęcia */}
          <div>
            <p className="mb-2 text-sm border-b border-[#327f7a] pb-2 font-medium">
              Następne zajęcia:
            </p>
            <div className="bg-teal-700 text-white px-4 py-2 rounded-lg inline-block text-sm">
              Podstawy programowania
            </div>
          </div>
        </div>
      </div>

      {/* Sekcja aktualności */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-center mb-2">Aktualności</h2>
        <div className="border-t-4 border-[#327f7a] w-1/3 mx-auto mb-4"></div>

        <h3 className="text-lg font-bold text-center mb-2">
          Spotkanie informacyjne dla wykładowców
        </h3>
        <p className="text-sm text-center max-w-3xl mx-auto text-[var(--color-text)]">
          W czwartek 14 listopada o godz. 14:00 w sali konferencyjnej odbędzie się spotkanie informacyjne dotyczące nowych zasad wprowadzania ocen i obsługi systemu USOSWEB.
        </p>

        <div className="border-t-2 border-[#327f7a] w-1/3 mx-auto mb-4 mt-4"></div>

        <h3 className="text-lg font-bold text-center mb-2">
          Szkolenie z obsługi platformy e-learningowej
        </h3>
        <p className="text-sm text-center max-w-3xl mx-auto text-[var(--color-text)]">
          W dniu 20 listopada o godz. 10:00 w laboratorium 204 odbędzie się szkolenie z nowej wersji systemu e-learningowego. Zainteresowanych wykładowców prosimy o wcześniejszą rejestrację.
        </p>

        <div className="border-t-4 border-[#327f7a] w-1/3 mx-auto mb-4"></div>

        <h3 className="text-lg font-bold text-center mb-2">
          Aktualizacja zasad prowadzenia zaliczeń
        </h3>
        <p className="text-sm text-center max-w-3xl mx-auto text-[var(--color-text)]">
          Od przyszłego semestru obowiązują zmodyfikowane zasady zaliczeń. Prosimy o zapoznanie się z dokumentem dostępnym w sekcji „Materiały dla wykładowców”.
        </p>
      </section>
    </main>
  );
}
