export default function ServerErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] rounded p-10 flex flex-col items-center shadow-lg">
        <h1 className="text-7xl font-extrabold text-[var(--color-accent)] mb-3">
          500
        </h1>
        <h2 className="text-2xl font-bold mb-2">Błąd serwera</h2>
        <p className="text-center text-[var(--color-text-secondary)] mb-6">
          Nie wiemy co się stało i prawdopodobnie nie chcemy tego wiedzieć...
        </p>
      </div>
    </div>
  );
}
