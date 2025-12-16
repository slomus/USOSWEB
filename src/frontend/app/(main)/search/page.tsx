"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

import { getApiBaseUrl } from "@/app/config/api";

const API_BASE = getApiBaseUrl();

// Wrapper dla Suspense (wymagane w Next.js przy używaniu useSearchParams)
export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6">Ładowanie parametrów...</div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!type || !id) {
      setError("Brak wymaganych parametrów (type, id).");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      let endpoint = "";

      // Mapowanie typu na endpointy z Twoich screenów
      switch (type) {
        case "users":
          endpoint = `/api/info/user/${id}`;
          break;
        case "subjects":
          endpoint = `/api/info/subject/${id}`;
          break;
        case "courses":
          endpoint = `/api/courses/${id}`;
          break;
        case "classes":
          endpoint = `/api/info/class/${id}`;
          break;
        case "buildings":
          endpoint = `/api/info/building/${id}`;
          break;
        default:
          setError(`Nieznany typ danych: ${type}`);
          setLoading(false);
          return;
      }

      try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Błąd API: ${res.status}`);
        }

        const json = await res.json();
        
        // Obsługa specyficznej struktury dla courses (zwraca obiekt { course: {...} })
        if (type === "courses" && json.course) {
          setData(json.course);
        } else {
          setData(json);
        }

      } catch (err: any) {
        setError(err.message || "Wystąpił błąd podczas pobierania danych.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, id]);

  // Funkcja pomocnicza do renderowania wiersza danych
  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col sm:flex-row border-b border-[var(--color-text)]/10 py-3 last:border-0">
      <span className="text-sm font-semibold text-[var(--color-text-secondary)] sm:w-1/3 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-[var(--color-text)] font-medium sm:w-2/3">
        {value || "-"}
      </span>
    </div>
  );

  return (
    <main className="min-h-screen px-6 py-8 text-[var(--color-text)] bg-[var(--color-bg)]">
      {/* Nagłówek i przycisk powrotu */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-accent)]">
          Szczegóły: <span className="text-[var(--color-text)] capitalize">{translateType(type)}</span>
        </h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-accent)] hover:text-white transition-colors shadow-sm"
        >
          &larr; Powrót
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-[var(--color-bg-secondary)] p-8 rounded-xl shadow-lg border-t-4 border-[var(--color-accent)]">
        {loading && <p className="text-center py-10 opacity-60">Ładowanie danych...</p>}
        
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500 text-red-500 rounded">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-2">
            
            {/* WIDOK: UŻYTKOWNIK (users) */}
            {type === "users" && (
              <>
                <div className="flex items-center gap-6 mb-6">
                  {data.profilePhotoPath ? (
                     <img src={`${API_BASE}${data.profilePhotoPath}`} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-[var(--color-accent)]" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-3xl font-bold text-[var(--color-accent)]">
                      {data.name?.[0]}{data.surname?.[0]}
                    </div>
                  )}
                  <div>
                    <h2 className="text-3xl font-bold">{data.name} {data.surname}</h2>
                    <p className="text-[var(--color-accent)] bg-[var(--color-accent)]/10 inline-block px-2 py-1 rounded text-sm mt-1">
                      {data.role || "Użytkownik"}
                    </p>
                  </div>
                </div>
                <InfoRow label="Email" value={<a href={`mailto:${data.email}`} className="hover:underline">{data.email}</a>} />
                <InfoRow label="ID Studenta/Pracownika" value={data.userId} />
                <InfoRow label="Status konta" value={data.active ? "Aktywne" : "Nieaktywne"} />
              </>
            )}

            {/* WIDOK: PRZEDMIOT (subjects) */}
            {type === "subjects" && (
              <>
                <h2 className="text-3xl font-bold mb-2">{data.name}</h2>
                <p className="text-xl text-[var(--color-text-secondary)] mb-6">{data.alias}</p>
                
                <InfoRow label="Opis" value={data.description} />
                <InfoRow label="Punkty ECTS" value={data.ects} />
                <InfoRow label="Sylabus" value={data.syllabus} />
                <InfoRow label="ID Przedmiotu" value={data.subjectId} />
              </>
            )}

            {/* WIDOK: KIERUNEK (courses) */}
            {type === "courses" && (
              <>
                <h2 className="text-3xl font-bold mb-2">{data.name}</h2>
                <p className="text-lg text-[var(--color-accent)] mb-6">{data.facultyName}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                    <span className="block text-xs uppercase text-[var(--color-text-secondary)]">Alias</span>
                    <span className="font-bold text-lg">{data.alias}</span>
                  </div>
                  <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                    <span className="block text-xs uppercase text-[var(--color-text-secondary)]">Tryb</span>
                    <span className="font-bold text-lg">{data.courseMode}</span>
                  </div>
                  <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                    <span className="block text-xs uppercase text-[var(--color-text-secondary)]">Stopień</span>
                    <span className="font-bold text-lg">{data.degreeType} (Stopień {data.degree})</span>
                  </div>
                  <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                    <span className="block text-xs uppercase text-[var(--color-text-secondary)]">Rok / Semestr</span>
                    <span className="font-bold text-lg">Rok {data.year}, Sem {data.semester}</span>
                  </div>
                </div>

                <div className="mt-6 border-t border-[var(--color-text)]/10 pt-4">
                   <h3 className="font-bold mb-2 uppercase text-sm text-[var(--color-text-secondary)]">Opiekun kierunku</h3>
                   <p className="text-lg">
                     {data.supervisorTitle} {data.supervisorName} {data.supervisorSurname} <span className="text-sm opacity-70">({data.supervisorDegree})</span>
                   </p>
                </div>
              </>
            )}

            {/* WIDOK: ZAJĘCIA (classes) */}
            {type === "classes" && (
              <>
                <h2 className="text-3xl font-bold mb-2">{data.subjectName}</h2>
                <p className="text-xl text-[var(--color-accent)] mb-6 capitalize">{data.classType} - {data.subjectAlias}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <InfoRow label="Sala" value={`Sala ${data.classroom}`} />
                    <InfoRow label="Budynek" value={data.buildingName} />
                    <InfoRow label="Adres" value={data.buildingAddress} />
                  </div>
                  <div>
                    <InfoRow label="Grupa" value={`Nr ${data.groupNr}`} />
                    <InfoRow label="Pojemność" value={`${data.currentCapacity}/${data.capacity}`} />
                    <InfoRow label="Zaliczenie" value={data.credit} />
                    <InfoRow label="Liczba godzin" value={data.spanOfHours} />
                  </div>
                </div>
              </>
            )}

            {/* WIDOK: BUDYNEK (buildings) */}
            {type === "buildings" && (
              <>
                 <div className="flex flex-col items-center text-center py-8">
                    <div className="p-6 bg-[var(--color-bg)] rounded-full mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-[var(--color-accent)]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H13.5m-1.5 3H13.5m-1.5 3H13.5M6.75 21v-3.75a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75V21M17.25 21v-3.75a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75V21M9 3.75v15m6-15v15" />
                      </svg>
                    </div>
                    <h2 className="text-3xl font-bold mb-2">{data.name}</h2>
                    <p className="text-xl opacity-80 mb-6">{data.address}</p>
                    <span className="text-xs text-[var(--color-text-secondary)]">ID Budynku: {data.buildingId}</span>
                 </div>
              </>
            )}

          </div>
        )}
      </div>
    </main>
  );
}

// Helper do ładnego wyświetlania typu w nagłówku
function translateType(type: string | null) {
  switch (type) {
    case "users": return "Użytkownik";
    case "subjects": return "Przedmiot";
    case "courses": return "Kierunek";
    case "classes": return "Zajęcia";
    case "buildings": return "Budynek";
    default: return type;
  }
}