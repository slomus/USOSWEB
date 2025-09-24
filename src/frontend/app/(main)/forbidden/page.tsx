export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] rounded p-10 flex flex-col items-center shadow-lg">
        <h1 className="text-7xl font-extrabold text-[var(--color-accent)] mb-3">
          403
        </h1>
        <h2 className="text-2xl font-bold mb-2">Dostęp zabroniony</h2>
        <p className="text-center text-[var(--color-text-secondary)] mb-6">
          Nie masz uprawnień do przeglądania tej strony lub zasobu.
        </p>
        <a
          href="/"
          className="px-6 py-2 rounded bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)]"
        >
          Pomoż mi wrócić w bezpieczne miejsce
        </a>
      </div>
    </div>
  );
}
