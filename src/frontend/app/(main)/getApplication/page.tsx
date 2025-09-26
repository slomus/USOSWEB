"use client";

import { useEffect, useState } from "react";

type ApplicationCategory = {
  categoryId: number;
  name: string;
  applicationStartDate: string;
  applicationEndDate: string;
  description: string;
  active: boolean;
};

type ApplicationStatus = "zakończona" | "aktywna" | "planowana";

type ApplicationFormData = {
  categoryId: number;
  title: string;
  content: string;
};

export default function ApplicationsPage() {
  const [categories, setCategories] = useState<ApplicationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ApplicationCategory | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [formData, setFormData] = useState<ApplicationFormData>({
    categoryId: 0,
    title: "",
    content: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string>("");

  // Komponenty SVG dla ikon
  const InfoIcon = () => (
    <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const ArrowRightIcon = () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const CloseIcon = () => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  const CheckIcon = () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );

  const getMockData = (): ApplicationCategory[] => [
    {
      categoryId: 1,
      name: "Oświadczenie o dochodach 2024",
      applicationStartDate: "2025-06-01 09:00",
      applicationEndDate: "2025-06-16 14:00",
      description: "Oświadczenie o dochodach na rok akademicki 2024/25",
      active: false
    },
    {
      categoryId: 2,
      name: "Wniosek o akademik 2025/26",
      applicationStartDate: "2025-06-01 09:00",
      applicationEndDate: "2025-06-16 14:00",
      description: "Wniosek o zakwaterowanie w akademiku na rok 2025/26",
      active: false
    },
    {
      categoryId: 3,
      name: "Wniosek o stypendium dla osób z niepełnosprawnościami",
      applicationStartDate: "2024-10-23 09:00",
      applicationEndDate: "2026-10-28 23:59",
      description: "Wniosek o stypendium dla studentów z niepełnosprawnościami",
      active: false
    },
    {
      categoryId: 4,
      name: "Wniosek o stypendium rektora dla studentów",
      applicationStartDate: "2024-10-23 09:00",
      applicationEndDate: "2026-10-28 23:59",
      description: "Wniosek o stypendium rektora za wyniki w nauce",
      active: false
    },
    {
      categoryId: 5,
      name: "Wniosek o stypendium socjalne",
      applicationStartDate: "2024-10-16 09:00",
      applicationEndDate: "2026-10-23 23:59",
      description: "Wniosek o stypendium socjalne na rok akademicki 2024/25",
      active: true
    },
    {
      categoryId: 6,
      name: "Wniosek o zapomogę",
      applicationStartDate: "2024-10-16 09:00",
      applicationEndDate: "2026-06-10 23:59",
      description: "Wniosek o jednorazową zapomogę finansową",
      active: true
    }
  ];

  const getApplicationStatus = (category: ApplicationCategory): ApplicationStatus => {
    const now = new Date();
    const startDate = category.applicationStartDate ? new Date(category.applicationStartDate) : null;
    const endDate = category.applicationEndDate ? new Date(category.applicationEndDate) : null;

    if (!startDate || !endDate) return "planowana";
    
    if (now < startDate) return "planowana";
    if (now > endDate) return "zakończona";
    return "aktywna";
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case "aktywna": return "text-[var(--color-accent)] bg-[var(--color-accent)]/10";
      case "zakończona": return "text-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/10";
      case "planowana": return "text-[var(--color-accent2)] bg-[var(--color-accent2)]/10";
      default: return "text-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/10";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("pl-PL", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCurrentAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth();
    
    if (month >= 9) { // od października
      return `${currentYear}/${currentYear + 1}`;
    } else {
      return `${currentYear - 1}/${currentYear}`;
    }
  };

  const resetForm = () => {
    setFormData({
      categoryId: 0,
      title: "",
      content: ""
    });
    setShowApplicationForm(false);
    setSelectedCategory(null);
    setSubmitSuccess("");
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      alert("Tytuł musi mieć co najmniej 3 znaki");
      return;
    }
    
    if (!formData.content.trim() || formData.content.trim().length < 10) {
      alert("Treść musi mieć co najmniej 10 znaków");
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch("http://localhost:8083/api/applications", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category_id: formData.categoryId,
          title: formData.title.trim(),
          content: formData.content.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Błąd HTTP: ${response.status}`);
      }

      const result = await response.json();
      setSubmitSuccess(`Wniosek został pomyślnie złożony! ID: ${result.application_id}`);
      
      // Reset formularza po udanym wysłaniu
      setTimeout(() => {
        resetForm();
      }, 3000);
      
    } catch (err: any) {
      console.error("Błąd podczas składania wniosku:", err);
      alert(`Nie udało się złożyć wniosku: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError("");
        
        const res = await fetch("http://localhost:8083/api/application-categories", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Endpoint kategorii wniosków nie jest dostępny");
          } else if (res.status === 500) {
            throw new Error("Błąd serwera");
          } else {
            throw new Error(`Błąd HTTP: ${res.status}`);
          }
        }

        const data = await res.json();
        setCategories(data.items || []);
      } catch (err: any) {
        console.error("Błąd podczas pobierania kategorii wniosków:", err);
        if (err.name === 'TypeError' || err.message.includes('fetch')) {
          setError("Nie można połączyć się z serwerem. Sprawdź czy backend jest uruchomiony.");
        } else {
          setError("Nie udało się pobrać kategorii wniosków");
        }
        setCategories(getMockData());
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleRetry = () => {
    setError("");
    setCategories([]);
    setLoading(true);
    
    const fetchCategories = async () => {
      try {
        const res = await fetch("http://localhost:8083/api/application-categories", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!res.ok) {
          throw new Error(`Błąd HTTP: ${res.status}`);
        }

        const data = await res.json();
        setCategories(data.items || []);
      } catch (err: any) {
        console.error("Błąd podczas pobierania kategorii wniosków:", err);
        setError("Nie udało się pobrać kategorii wniosków");
        setCategories(getMockData());
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  };

  const handleApplicationAction = (category: ApplicationCategory, action: "info" | "apply") => {
    if (action === "info") {
      setSelectedCategory(category);
    } else if (action === "apply") {
      const status = getApplicationStatus(category);
      if (status === "zakończona") {
        alert("Termin składania wniosków dla tej kategorii już minął.");
        return;
      }
      if (status === "planowana") {
        alert("Termin składania wniosków dla tej kategorii jeszcze się nie rozpoczął.");
        return;
      }
      
      setFormData(prev => ({ ...prev, categoryId: category.categoryId }));
      setSelectedCategory(category);
      setShowApplicationForm(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)] mb-4 mx-auto"></div>
          <p className="text-lg text-[var(--color-text-secondary)]">Ładowanie kategorii wniosków...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <div className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-accent)] px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-[var(--color-accent)] mb-2">
            Wnioski, które można złożyć w Twoich jednostkach
          </h1>
          <div className="flex items-center space-x-2 text-sm text-[var(--color-text-secondary)]">
            <InfoIcon />
            <span>Rok akademicki {getCurrentAcademicYear()}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-[var(--color-bg-secondary)] border border-[var(--color-accent2)] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[var(--color-accent2)] mb-1">Uwaga</h3>
                <p className="text-[var(--color-text-secondary)]">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                className="bg-[var(--color-accent2)] hover:bg-[var(--color-accent)] text-white px-4 py-2 rounded transition-colors"
              >
                Ponów
              </button>
            </div>
          </div>
        )}

        {/* Komunikat o sukcesie */}
        {submitSuccess && (
          <div className="mb-6 bg-green-100 border border-green-400 rounded-lg p-4">
            <div className="flex items-center">
              <CheckIcon />
              <p className="ml-2 text-green-800 font-semibold">{submitSuccess}</p>
            </div>
          </div>
        )}

        {/* Statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-lg font-semibold text-[var(--color-accent)] mb-2">Aktywne wnioski</h3>
            <p className="text-3xl font-bold">
              {categories.filter(cat => getApplicationStatus(cat) === "aktywna").length}
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-lg font-semibold text-[var(--color-accent)] mb-2">Planowane</h3>
            <p className="text-3xl font-bold">
              {categories.filter(cat => getApplicationStatus(cat) === "planowana").length}
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-lg font-semibold text-[var(--color-accent)] mb-2">Zakończone</h3>
            <p className="text-3xl font-bold">
              {categories.filter(cat => getApplicationStatus(cat) === "zakończona").length}
            </p>
          </div>
        </div>

        {/* Tabela wniosków */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg overflow-hidden">
          <div className="bg-[var(--color-accent)] text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Dostępne kategorie wniosków</h2>
          </div>

          {categories.length === 0 && !loading ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-2">Brak dostępnych wniosków</h3>
              <p className="text-[var(--color-text-secondary)]">
                Obecnie nie ma dostępnych kategorii wniosków.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-accent)]/10">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold">Nazwa</th>
                    <th className="text-center py-4 px-4 font-semibold">Tury</th>
                    <th className="text-left py-4 px-4 font-semibold">Organizator</th>
                    <th className="text-center py-4 px-4 font-semibold">Cykl</th>
                    <th className="text-center py-4 px-6 font-semibold">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-accent)]/20">
                  {categories.map((category) => {
                    const status = getApplicationStatus(category);
                    return (
                      <tr key={category.categoryId} className="hover:bg-[var(--color-bg)] transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-8 h-8 bg-[var(--color-accent)]/10 rounded border border-[var(--color-accent)]/30 flex items-center justify-center">
                                <span className="text-xs text-[var(--color-accent)] font-semibold">
                                  {category.categoryId}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-[var(--color-text)]">{category.name}</div>
                              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                                {category.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm">
                            <div className="font-medium">Uniwersytet Kazimierza Wielkiego w Bydgoszczy</div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1 text-sm text-[var(--color-text-secondary)]">
                            <CalendarIcon />
                            <span>Rok akademicki {getCurrentAcademicYear()}</span>
                          </div>
                          {category.applicationStartDate && category.applicationEndDate && (
                            <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                              {formatDate(category.applicationStartDate)} - {formatDate(category.applicationEndDate)}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleApplicationAction(category, "info")}
                              className="flex items-center space-x-1 text-[var(--color-accent)] hover:text-[var(--color-accent2)] transition-colors text-sm"
                            >
                              <span>informacje o wniosku</span>
                              <ArrowRightIcon />
                            </button>
                            <span className="text-[var(--color-text-secondary)]">→</span>
                            <button
                              onClick={() => handleApplicationAction(category, "apply")}
                              className={`flex items-center space-x-1 transition-colors text-sm ${
                                status === "zakończona" || status === "planowana"
                                  ? "text-[var(--color-text-secondary)] cursor-not-allowed"
                                  : "text-[var(--color-accent)] hover:text-[var(--color-accent2)]"
                              }`}
                              disabled={status === "zakończona" || status === "planowana"}
                            >
                              <span>zacznij wypełniać</span>
                              <ArrowRightIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal z informacjami o wniosku */}
      {selectedCategory && !showApplicationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-md w-full mx-4 border border-[var(--color-accent)]">
            <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-4">
              {selectedCategory.name}
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-4">
              {selectedCategory.description}
            </p>
            {selectedCategory.applicationStartDate && selectedCategory.applicationEndDate && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Terminy:</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Początek: {formatDate(selectedCategory.applicationStartDate)}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Koniec: {formatDate(selectedCategory.applicationEndDate)}
                </p>
              </div>
            )}
            <div className="mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(getApplicationStatus(selectedCategory))}`}>
                Status: {getApplicationStatus(selectedCategory)}
              </span>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-4 py-2 bg-[var(--color-text-secondary)] text-white rounded hover:bg-[var(--color-accent)] transition-colors"
              >
                Zamknij
              </button>
              <button
                onClick={() => handleApplicationAction(selectedCategory, "apply")}
                className={`px-4 py-2 rounded transition-colors ${
                  getApplicationStatus(selectedCategory) === "aktywna"
                    ? "bg-[var(--color-accent)] hover:bg-[var(--color-accent2)] text-white"
                    : "bg-[var(--color-text-secondary)] text-white cursor-not-allowed"
                }`}
                disabled={getApplicationStatus(selectedCategory) !== "aktywna"}
              >
                Składaj wniosek
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal z formularzem wniosku */}
      {showApplicationForm && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-2xl w-full mx-4 border border-[var(--color-accent)] my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-[var(--color-accent)]">
                Złóż wniosek: {selectedCategory.name}
              </h3>
              <button
                onClick={resetForm}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Tytuł wniosku *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="Wprowadź tytuł wniosku (min. 3 znaki)"
                  required
                  minLength={3}
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Treść wniosku *
                </label>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={8}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-vertical"
                  placeholder="Wprowadź treść wniosku (min. 10 znaków)"
                  required
                  minLength={10}
                />
              </div>

              <div className="bg-[var(--color-bg)] p-4 rounded-md border border-[var(--color-accent)]/30">
                <h4 className="font-semibold text-[var(--color-text)] mb-2">Informacje o kategorii:</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {selectedCategory.description}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                  Termin: {formatDate(selectedCategory.applicationStartDate)} - {formatDate(selectedCategory.applicationEndDate)}
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-[var(--color-text-secondary)] text-white rounded hover:bg-[var(--color-accent)] transition-colors"
                  disabled={submitting}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? "Składanie..." : "Złóż wniosek"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}