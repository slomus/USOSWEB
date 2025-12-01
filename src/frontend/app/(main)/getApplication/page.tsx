"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FaClock, FaCheckCircle, FaTimesCircle, FaFileAlt } from "react-icons/fa";

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

const API_BASE = "http://localhost:8083";

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Pobierz kategorie wniosków
      const categoriesResponse = await fetch(`${API_BASE}/api/application-categories`, {
        credentials: "include",
      });

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        console.log("Categories data:", categoriesData);
        setCategories(categoriesData.items || []);
      }

      // Pobierz wnioski studenta
      const applicationsResponse = await fetch(`${API_BASE}/api/applications`, {
        credentials: "include",
      });

      if (applicationsResponse.ok) {
        const applicationsData = await applicationsResponse.json();
        console.log("Applications data:", applicationsData);
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
        headers: {
          "Content-Type": "application/json",
        },
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
        setSubmitSuccess("Wniosek został wysłany pomyślnie!");
        
        // Odśwież listę wniosków
        fetchData();
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
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-1">
            <FaClock /> Oczekujący
          </span>
        );
      case "approved":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
            <FaCheckCircle /> Zaakceptowany
          </span>
        );
      case "rejected":
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-1">
            <FaTimesCircle /> Odrzucony
          </span>
        );
      default:
        return null;
    }
  };

  // Statystyki wniosków
  const submittedCount = myApplications.filter(app => app.status === "submitted").length;
  const approvedCount = myApplications.filter(app => app.status === "approved").length;
  const rejectedCount = myApplications.filter(app => app.status === "rejected").length;
  const totalCount = myApplications.length;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="flex-1 flex flex-col">
          <main className="p-6 max-w-6xl mx-auto w-full pt-24">
            <div className="flex justify-center items-center h-64">
              <div className="text-xl">Ładowanie danych...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex-1 flex flex-col">
        <main className="p-6 max-w-6xl mx-auto w-full pt-24">
          {/* Nagłówek */}
          <h1 className="text-4xl font-bold mb-8 border-b border-[var(--color-accent)] pb-4">
            Wnioski
          </h1>

          {/* Komunikat sukcesu */}
          {submitSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-full p-2">
                  <FaCheckCircle className="text-green-600 text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Sukces!</h3>
                  <p className="text-green-700">{submitSuccess}</p>
                </div>
              </div>
              <button
                onClick={() => setSubmitSuccess("")}
                className="text-green-600 hover:text-green-800 transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* Statystyki wniosków */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
              <div className="flex items-center gap-3 mb-2">
                <FaFileAlt className="text-[var(--color-accent)] text-2xl" />
                <h3 className="text-lg font-semibold text-[var(--color-accent)]">
                  Wszystkie wnioski
                </h3>
              </div>
              <p className="text-3xl font-bold">{totalCount}</p>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
              <div className="flex items-center gap-3 mb-2">
                <FaClock className="text-yellow-500 text-2xl" />
                <h3 className="text-lg font-semibold text-[var(--color-accent)]">
                  Oczekujące
                </h3>
              </div>
              <p className="text-3xl font-bold">{submittedCount}</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Wniosek czeka na rozpatrzenie
              </p>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
              <div className="flex items-center gap-3 mb-2">
                <FaCheckCircle className="text-green-500 text-2xl" />
                <h3 className="text-lg font-semibold text-[var(--color-accent)]">
                  Zaakceptowane
                </h3>
              </div>
              <p className="text-3xl font-bold">{approvedCount}</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Wniosek został rozpatrzony pozytywnie
              </p>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
              <div className="flex items-center gap-3 mb-2">
                <FaTimesCircle className="text-red-500 text-2xl" />
                <h3 className="text-lg font-semibold text-[var(--color-accent)]">
                  Odrzucone
                </h3>
              </div>
              <p className="text-3xl font-bold">{rejectedCount}</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Wniosek został odrzucony
              </p>
            </div>
          </div>

          {/* Moje wnioski */}
          {myApplications.length > 0 && (
            <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
              <h2 className="text-2xl font-semibold mb-6">Moje wnioski</h2>
              <div className="space-y-4">
                {myApplications.map((app) => {
                  const category = categories.find(c => c.categoryId === app.categoryId);
                  return (
                    <div
                      key={app.applicationId}
                      className="border border-[var(--color-accent)] rounded-xl p-4 bg-[var(--color-bg)] shadow-md"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{app.title}</h3>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            Kategoria: {category?.name || "Nieznana"}
                          </p>
                        </div>
                        {getStatusBadge(app.status)}
                      </div>
                      <p className="text-sm mb-2">{app.content}</p>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        <p>Utworzono: {new Date(app.createdAt).toLocaleString("pl-PL")}</p>
                        <p>Zaktualizowano: {new Date(app.updatedAt).toLocaleString("pl-PL")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tabela kategorii wniosków */}
          <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg mb-10">
            <h2 className="text-2xl font-semibold mb-6">
              Dostępne kategorie wniosków
            </h2>

            {categories.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-2">
                  Brak dostępnych wniosków
                </h3>
                <p className="text-[var(--color-text-secondary)]">
                  Obecnie nie ma dostępnych kategorii wniosków dla Twojego konta.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg)] border-b border-[var(--color-accent)]">
                      <th className="p-3">Nazwa wniosku</th>
                      <th className="p-3">Opis</th>
                      <th className="p-3">Okres składania</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Akcja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => {
                      const status = getApplicationStatus(category);
                      const isActive = status === "aktywna";
                      
                      return (
                        <tr
                          key={category.categoryId}
                          className="border-b border-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition"
                        >
                          <td className="p-3 font-semibold">{category.name}</td>
                          <td className="p-3">{category.description || "Brak opisu"}</td>
                          <td className="p-3">
                            <div className="text-sm">
                              <p>Od: {new Date(category.applicationStartDate).toLocaleDateString("pl-PL")}</p>
                              <p>Do: {new Date(category.applicationEndDate).toLocaleDateString("pl-PL")}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                status === "aktywna"
                                  ? "bg-green-100 text-green-800"
                                  : status === "planowana"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => setSelectedCategory(category)}
                              disabled={!isActive}
                              className={`px-4 py-2 rounded-lg font-medium transition ${
                                isActive
                                  ? "bg-[var(--color-accent)] text-white hover:opacity-90"
                                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                              }`}
                            >
                              {isActive ? "Wypełnij wniosek" : "Niedostępny"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Formularz wniosku */}
          {selectedCategory && (
            <section className="bg-[var(--color-bg-secondary)] p-6 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-semibold mb-6">
                Wypełnij wniosek: {selectedCategory.name}
              </h2>

              <form onSubmit={handleSubmitApplication} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tytuł wniosku <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={applicationForm.title}
                    onChange={(e) =>
                      setApplicationForm({ ...applicationForm, title: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
                    placeholder="Wprowadź tytuł wniosku"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Treść wniosku <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={applicationForm.content}
                    onChange={(e) =>
                      setApplicationForm({ ...applicationForm, content: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)] min-h-[200px]"
                    placeholder="Wprowadź treść wniosku"
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-[var(--color-accent)] text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Wysyłanie..." : "Wyślij wniosek"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(null);
                      setApplicationForm({ title: "", content: "" });
                    }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:opacity-90 transition"
                  >
                    Anuluj
                  </button>
                </div>
              </form>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}