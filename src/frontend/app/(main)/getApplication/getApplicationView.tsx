"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import { FaClock, FaCheckCircle, FaTimesCircle, FaFileAlt, FaPaperPlane, FaCalendarAlt } from "react-icons/fa";
import { getApiBaseUrl } from "@/app/config/api";

// --- TYPY ---

interface ApplicationCategory {
  categoryId: number;
  name: string;
  description: string;
  applicationStartDate: string;
  applicationEndDate: string;
  active: boolean;
}

interface Application {
  applicationId: number;
  categoryId: number;
  albumNr: number;
  title: string;
  content: string;
  status: "submitted" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

const API_BASE = getApiBaseUrl();

export default function GetApplicationPage() {
  const [categories, setCategories] = useState<ApplicationCategory[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ApplicationCategory | null>(null);
  
  const [applicationForm, setApplicationForm] = useState({
    title: "",
    content: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Ref do scrollowania do formularza
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [categoriesResponse, applicationsResponse] = await Promise.all([
        fetch(`${API_BASE}/api/application-categories`, { credentials: "include" }),
        fetch(`${API_BASE}/api/applications`, { credentials: "include" })
      ]);

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.items || []);
      }

      if (applicationsResponse.ok) {
        const applicationsData = await applicationsResponse.json();
        setMyApplications(applicationsData.items || []);
      }
    } catch (error) {
      console.error("Błąd podczas pobierania danych:", error);
      toast.error("Nie udało się pobrać danych");
    } finally {
      setLoading(false);
    }
  };

  const getApplicationStatus = (category: ApplicationCategory) => {
    const now = new Date();
    const startDate = new Date(category.applicationStartDate);
    const endDate = new Date(category.applicationEndDate);

    if (now < startDate) return "planowana";
    if (now >= startDate && now <= endDate) return "aktywna";
    return "zakończona";
  };

  const handleSelectCategory = (category: ApplicationCategory) => {
    setSelectedCategory(category);
    setSubmitSuccess("");
    // Płynne przewinięcie do formularza (UX dla mobile)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategory) {
      toast.error("Wybierz kategorię wniosku");
      return;
    }

    if (!applicationForm.title || !applicationForm.content) {
      toast.error("Wypełnij wszystkie pola");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/applications`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: selectedCategory.categoryId,
          title: applicationForm.title,
          content: applicationForm.content,
        }),
      });

      if (response.ok) {
        toast.success("Wniosek został wysłany pomyślnie!");
        setApplicationForm({ title: "", content: "" });
        setSelectedCategory(null);
        setSubmitSuccess("Twój wniosek został przyjęty do systemu.");
        fetchData();
        // Scroll do góry, żeby zobaczyć komunikat sukcesu
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const errorData = await response.json();
        toast.error(`Błąd: ${errorData.message || "Nie udało się wysłać wniosku"}`);
      }
    } catch (error) {
      console.error("Błąd wysyłania wniosku:", error);
      toast.error("Wystąpił błąd podczas wysyłania wniosku");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            <FaClock className="text-[10px]" /> Oczekujący
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            <FaCheckCircle className="text-[10px]" /> Zaakceptowany
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <FaTimesCircle className="text-[10px]" /> Odrzucony
          </span>
        );
      default:
        return null;
    }
  };

  // Statystyki
  const submittedCount = myApplications.filter(app => app.status === "submitted").length;
  const approvedCount = myApplications.filter(app => app.status === "approved").length;
  const rejectedCount = myApplications.filter(app => app.status === "rejected").length;
  const totalCount = myApplications.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)] mb-4 mx-auto"></div>
          <p className="text-[var(--color-text-secondary)]">Ładowanie wniosków...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] pb-10">
      
      {/* HEADER */}
      <div className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-accent)]/20 px-4 md:px-6 py-8 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-[var(--color-accent)] mb-2">
            Wnioski i Podania
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm md:text-base">
            Zarządzaj swoimi wnioskami, sprawdzaj ich status i składaj nowe dokumenty.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* SUKCES BANNER */}
        {submitSuccess && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start sm:items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
              <div>
                <h3 className="font-bold text-green-800 text-sm md:text-base">Sukces!</h3>
                <p className="text-green-700 text-xs md:text-sm">{submitSuccess}</p>
              </div>
            </div>
            <button
              onClick={() => setSubmitSuccess("")}
              className="text-green-600 hover:text-green-800 transition-colors p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* STATYSTYKI GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--color-bg-secondary)] rounded-xl p-5 border border-[var(--color-text)]/5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[var(--color-bg)] rounded-lg text-[var(--color-accent)]">
                 <FaFileAlt className="text-xl" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Wszystkie
              </h3>
            </div>
            <p className="text-3xl font-bold ml-1">{totalCount}</p>
          </div>

          <div className="bg-[var(--color-bg-secondary)] rounded-xl p-5 border border-[var(--color-text)]/5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[var(--color-bg)] rounded-lg text-yellow-500">
                 <FaClock className="text-xl" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Oczekujące
              </h3>
            </div>
            <p className="text-3xl font-bold ml-1">{submittedCount}</p>
          </div>

          <div className="bg-[var(--color-bg-secondary)] rounded-xl p-5 border border-[var(--color-text)]/5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-[var(--color-bg)] rounded-lg text-green-500">
                 <FaCheckCircle className="text-xl" />
               </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Przyjęte
              </h3>
            </div>
            <p className="text-3xl font-bold ml-1">{approvedCount}</p>
          </div>

          <div className="bg-[var(--color-bg-secondary)] rounded-xl p-5 border border-[var(--color-text)]/5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-[var(--color-bg)] rounded-lg text-red-500">
                 <FaTimesCircle className="text-xl" />
               </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Odrzucone
              </h3>
            </div>
            <p className="text-3xl font-bold ml-1">{rejectedCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEWA KOLUMNA: DOSTĘPNE WNIOSKI (2/3 szerokości) */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* DOSTĘPNE KATEGORIE */}
                <section className="bg-[var(--color-bg-secondary)] rounded-xl shadow-md border border-[var(--color-text)]/5 overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--color-text)]/10 bg-[var(--color-bg-secondary)] flex justify-between items-center">
                        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                            <FaPaperPlane className="text-[var(--color-accent)]" />
                            Złóż nowy wniosek
                        </h2>
                    </div>

                    {categories.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-[var(--color-text-secondary)]">Brak dostępnych kategorii wniosków.</p>
                        </div>
                    ) : (
                        <>
                            {/* TABELA (Desktop) */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[var(--color-bg)] text-[var(--color-text-secondary)] uppercase text-xs tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Nazwa wniosku</th>
                                            <th className="px-6 py-3 font-semibold">Okres składania</th>
                                            <th className="px-6 py-3 font-semibold text-center">Status</th>
                                            <th className="px-6 py-3 font-semibold text-right">Akcja</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-text)]/5">
                                        {categories.map((category) => {
                                            const status = getApplicationStatus(category);
                                            const isActive = status === "aktywna";
                                            return (
                                                <tr key={category.categoryId} className="hover:bg-[var(--color-bg)]/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-[var(--color-text)]">{category.name}</div>
                                                        <div className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-1">{category.description}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                                                        <div className="flex flex-col text-xs">
                                                            <span>Od: {new Date(category.applicationStartDate).toLocaleDateString("pl-PL")}</span>
                                                            <span>Do: {new Date(category.applicationEndDate).toLocaleDateString("pl-PL")}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                            status === "aktywna" ? "bg-green-100 text-green-800" :
                                                            status === "planowana" ? "bg-blue-100 text-blue-800" :
                                                            "bg-gray-100 text-gray-800"
                                                        }`}>
                                                            {status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleSelectCategory(category)}
                                                            disabled={!isActive}
                                                            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                                                                isActive 
                                                                ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-sm" 
                                                                : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] cursor-not-allowed border border-[var(--color-text)]/10"
                                                            }`}
                                                        >
                                                            Wybierz
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* KARTY (Mobile) */}
                            <div className="md:hidden divide-y divide-[var(--color-text)]/5">
                                {categories.map((category) => {
                                    const status = getApplicationStatus(category);
                                    const isActive = status === "aktywna";
                                    return (
                                        <div key={category.categoryId} className="p-4 bg-[var(--color-bg-secondary)]">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-[var(--color-text)] pr-2">{category.name}</h3>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 ${
                                                    status === "aktywna" ? "bg-green-100 text-green-800" :
                                                    status === "planowana" ? "bg-blue-100 text-blue-800" :
                                                    "bg-gray-100 text-gray-800"
                                                }`}>
                                                    {status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[var(--color-text-secondary)] mb-3">{category.description}</p>
                                            
                                            <div className="flex justify-between items-end">
                                                <div className="text-xs text-[var(--color-text-secondary)]">
                                                    <div className="flex items-center gap-1"><FaCalendarAlt /> {new Date(category.applicationStartDate).toLocaleDateString("pl-PL")} - {new Date(category.applicationEndDate).toLocaleDateString("pl-PL")}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleSelectCategory(category)}
                                                    disabled={!isActive}
                                                    className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                                                        isActive 
                                                        ? "bg-[var(--color-accent)] text-white shadow-sm active:scale-95 transform" 
                                                        : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-text)]/10"
                                                    }`}
                                                >
                                                    {isActive ? "Wypełnij" : "Niedostępny"}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </section>

                {/* FORMULARZ (Pokazuje się po wybraniu kategorii) */}
                {selectedCategory && (
                    <section ref={formRef} className="bg-[var(--color-bg-secondary)] rounded-xl shadow-lg border border-[var(--color-accent)] animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-[var(--color-accent)] text-white px-6 py-4 rounded-t-xl">
                            <h2 className="text-lg md:text-xl font-bold">Wypełnij wniosek</h2>
                            <p className="text-white/80 text-sm mt-1">{selectedCategory.name}</p>
                        </div>
                        
                        <form onSubmit={handleSubmitApplication} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-[var(--color-text)]">
                                    Tytuł wniosku <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={applicationForm.title}
                                    onChange={(e) => setApplicationForm({ ...applicationForm, title: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-text)]/20 bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none transition-all"
                                    placeholder="Np. Podanie o przedłużenie sesji"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-[var(--color-text)]">
                                    Treść uzasadnienia <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={applicationForm.content}
                                    onChange={(e) => setApplicationForm({ ...applicationForm, content: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-text)]/20 bg-[var(--color-bg)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none transition-all min-h-[150px]"
                                    placeholder="Opisz swoją sytuację..."
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-6 py-3 bg-[var(--color-accent)] text-white rounded-lg font-bold hover:bg-[var(--color-accent-hover)] transition disabled:opacity-70 disabled:cursor-wait shadow-md"
                                >
                                    {submitting ? "Wysyłanie..." : "Wyślij wniosek"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategory(null);
                                        setApplicationForm({ title: "", content: "" });
                                    }}
                                    className="px-6 py-3 bg-[var(--color-bg)] border border-[var(--color-text)]/20 text-[var(--color-text)] rounded-lg font-bold hover:bg-[var(--color-bg-hover)] transition"
                                >
                                    Anuluj
                                </button>
                            </div>
                        </form>
                    </section>
                )}
            </div>

            {/* PRAWA KOLUMNA: MOJE WNIOSKI (1/3 szerokości) */}
            <div className="lg:col-span-1">
                 <section className="bg-[var(--color-bg-secondary)] rounded-xl shadow-md border border-[var(--color-text)]/5 h-fit sticky top-24">
                    <div className="px-5 py-4 border-b border-[var(--color-text)]/10 flex justify-between items-center">
                        <h2 className="text-lg font-bold">Historia wniosków</h2>
                        <span className="text-xs font-bold bg-[var(--color-bg)] px-2 py-1 rounded-full text-[var(--color-text-secondary)]">{myApplications.length}</span>
                    </div>

                    <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {myApplications.length === 0 ? (
                            <p className="text-center text-sm text-[var(--color-text-secondary)] py-4">Brak złożonych wniosków.</p>
                        ) : (
                            myApplications.map((app) => {
                                const category = categories.find(c => c.categoryId === app.categoryId);
                                return (
                                    <div key={app.applicationId} className="bg-[var(--color-bg)] border border-[var(--color-text)]/10 rounded-lg p-3 hover:border-[var(--color-accent)]/30 transition-colors group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)] truncate max-w-[60%]">
                                                {category?.name || "Inne"}
                                            </span>
                                            {getStatusBadge(app.status)}
                                        </div>
                                        
                                        <h3 className="text-sm font-bold text-[var(--color-text)] mb-1 group-hover:text-[var(--color-accent)] transition-colors">
                                            {app.title}
                                        </h3>
                                        
                                        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-2">
                                            {app.content}
                                        </p>
                                        
                                        <div className="text-[10px] text-[var(--color-text-secondary)] border-t border-[var(--color-text)]/5 pt-2 flex justify-between">
                                            <span>{new Date(app.createdAt).toLocaleDateString("pl-PL")}</span>
                                            <span>ID: #{app.applicationId}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                 </section>
            </div>

        </div>
      </div>
    </div>
  );
}