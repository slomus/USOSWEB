export default function StudentMainPage() {
  return (
    <main className="min-h-screen px-6 py-6 text-[var(--color-text)] bg-[var(--color-bg)]">
      {/* Główna siatka */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Lewa kolumna – plan zajęć */}
        <div className="bg-[#1E1E1E] p-6 rounded-xl shadow-md h-full flex items-center justify-center">
          <div className="text-[#9C9793] text-center">
            <p className="text-lg">
              [Tu będzie widok kalendarza / planu zajęć]
            </p>
          </div>
        </div>

        {/* Prawa kolumna – informacje */}
        <div className="bg-[#1E1E1E] p-6 rounded-xl shadow-md flex flex-col justify-between gap-6">
          {/* Oceny */}
          <div>
            <p className="mb-2 text-sm">Dodano nowe oceny:</p>
            <div className="flex gap-4">
              <div className="bg-teal-700 text-white px-4 py-1 rounded font-bold">
                5
              </div>
              <div className="bg-red-700 text-white px-4 py-1 rounded font-bold">
                2
              </div>
            </div>
          </div>

          {/* Aktualne zajęcia */}
          <div>
            <p className="mb-2 text-sm border-t border-[#327f7a] pt-4">
              Aktualne zajęcia:
            </p>
            <div className="bg-teal-700 text-white px-4 py-1 rounded inline-block text-sm">
              Systemy rozproszone
            </div>
          </div>

          {/* Następne zajęcia */}
          <div>
            <p className="mb-2 text-sm border-t border-[#327f7a] pt-4">
              Następne zajęcia:
            </p>
            <div className="bg-teal-700 text-white px-4 py-1 rounded inline-block text-sm">
              Złomowanie opli
            </div>
          </div>
        </div>
      </div>

      {/* Sekcja aktualności */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-center mb-2">Aktualności</h2>
        <div className="border-t-4 border-[#327f7a] w-1/3 mx-auto mb-4"></div>

        <h3 className="text-lg font-bold text-center mb-2">
          SABOTAŻ W BIAŁY DZIEŃ! – OPEL ASTRA NIE PRZYJĘTY NA ZŁOMIE!!!
        </h3>
        <p className="text-sm text-center max-w-3xl mx-auto text-[#9C9793]">
          W rozmowie z właścicielem – 22 letnim Panem Karolem dowiedzieliśmy
          się, że nikt nie kupuje do nich części, bo i tak już są popsute –
          ujawnił redaktor. Nikt tego nie chce nawet na złomie – oświadczył
          mężczyzna.
        </p>
        <div className="border-t-2 border-[#327f7a] w-1/3 mx-auto mb-4 mt-4"></div>
        <h3 className="text-lg font-bold text-center mb-2">
          JENDAK GO PRZYJĘLI!!! 0,50 zł za kilogram - nie ma tragedii
        </h3>
        <p className="text-sm text-center max-w-3xl mx-auto text-[#9C9793]">
          W rozmowie z właścicielem – 22 letnim Panem Karolem dowiedzieliśmy
          się, że mimo wszystko cieszy się z oddania auta na szrot &quot;Panie i tak
          by tego nikt nie kupił&quot; odpowiedział na pytanie dlaczego poszedł na
          żyletki.
        </p>
      </section>
    </main>
  );
}
