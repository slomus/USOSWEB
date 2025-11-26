"use client";

import { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaSearch, FaFilter, FaCheckCircle, FaTimesCircle, FaClock } from "react-icons/fa";

type ApplicationStatus = "submitted" | "approved" | "rejected";

type Application = {
  applicationId: number;
  categoryId: number;
  albumNr: number;
  title: string;
  content: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
};

type ApplicationCategory = {
  categoryId: number;
  name: string;
  description: string;
  applicationStartDate: string;
  applicationEndDate: string;
  active: boolean;
};

type Student = {
  user_id: number;
  name: string;
  surname: string;
  email: string;
  albumNr?: number;
};

type ApplicationForm = {
  categoryId: string;
  albumNr: string;
  title: string;
  content: string;
  status: ApplicationStatus;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

export default function AdminApplicationsManagementPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [categories, setCategories] = useState<ApplicationCategory[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filtry
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Modalne okna
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [viewingApplication, setViewingApplication] = useState<Application | null>(null);
  const [deletingAppId, setDeletingAppId] = useState<number | null>(null);
  
  // Formularz
  const [appForm, setAppForm] = useState<ApplicationForm>({
    categoryId: "",
    albumNr: "",
    title: "",
    content: "",
    status: "submitted",
  });

  // Pobieranie wszystkich danych
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Pobierz wszystkie wnioski
        const appsRes = await fetch(`${API_BASE}/api/applications?page=1&pageSize=1000`, {
          credentials: "include",
        });
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          setApplications(appsData.items || []);
          setFilteredApplications(appsData.items || []);
        }

        // Pobierz kategorie wniosków
        const catsRes = await fetch(`${API_BASE}/api/application-categories`, {
          credentials: "include",
        });
        if (catsRes.ok) {
          const catsData = await catsRes.json();
          setCategories(catsData.items || []);
        }

        // Pobierz listę studentów
        const studentsRes = await fetch(`${API_BASE}/api/auth/users`, {
          credentials: "include",
        });
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          const studentsList = studentsData.users?.filter((u: any) => u.role === "student") || [];
          setStudents(studentsList);
        }

      } catch (err) {
        console.error("Błąd pobierania danych:", err);
        setError("Nie udało się pobrać danych");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtrowanie wniosków
  useEffect(() => {
    let filtered = [...applications];

    if (selectedStatus) {
      filtered = filtered.filter(a => a.status === selectedStatus);
    }

    if (selectedCategory) {
      filtered = filtered.filter(a => a.categoryId.toString() === selectedCategory);
    }

    if (selectedStudent) {
      filtered = filtered.filter(a => a.albumNr.toString() === selectedStudent);
    }

    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredApplications(filtered);
  }, [selectedStatus, selectedCategory, selectedStudent, searchTerm, applications]);

  // Dodawanie nowego wniosku
  const handleAddApplication = async () => {
    if (!appForm.categoryId || !appForm.albumNr || !appForm.title || !appForm.content) {
      alert("Wypełnij wszystkie wymagane pola");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/applications`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: parseInt(appForm.categoryId),
          albumNr: parseInt(appForm.albumNr),
          title: appForm.title,
          content: appForm.content,
        }),
      });

      if (response.ok) {
        alert("Wniosek dodany pomyślnie!");
        setShowAddModal(false);
        resetForm();
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Błąd: ${errorData.message || "Nie udało się dodać wniosku"}`);
      }
    } catch (err) {
      console.error("Błąd dodawania wniosku:", err);
      alert("Wystąpił błąd podczas dodawania wniosku");
    }
  };

  // Edycja wniosku (zmiana statusu, tytułu, treści)
  const handleEditApplication = async () => {
    if (!editingApplication) return;

    try {
      const response = await fetch(`${API_BASE}/api/applications`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: editingApplication.applicationId,
          categoryId: parseInt(appForm.categoryId),
          title: appForm.title,
          content: appForm.content,
          status: appForm.status,
        }),
      });

      if (response.ok) {
        alert("Wniosek zaktualizowany pomyślnie!");
        setEditingApplication(null);
        resetForm();
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Błąd: ${errorData.message || "Nie udało się zaktualizować wniosku"}`);
      }
    } catch (err) {
      console.error("Błąd edycji wniosku:", err);
      alert("Wystąpił błąd podczas edycji wniosku");
    }
  };

  // Szybka zmiana statusu
  const handleQuickStatusChange = async (app: Application, newStatus: ApplicationStatus) => {
    if (!confirm(`Czy na pewno chcesz zmienić status na "${newStatus}"?`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/applications`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: app.applicationId,
          categoryId: app.categoryId,
          title: app.title,
          content: app.content,
          status: newStatus,
        }),
      });

      if (response.ok) {
        alert("Status zmieniony pomyślnie!");
        // Zaktualizuj lokalnie
        setApplications(applications.map(a => 
          a.applicationId === app.applicationId 
            ? { ...a, status: newStatus }
            : a
        ));
      } else {
        const errorData = await response.json();
        alert(`Błąd: ${errorData.message || "Nie udało się zmienić statusu"}`);
      }
    } catch (err) {
      console.error("Błąd zmiany statusu:", err);
      alert("Wystąpił błąd podczas zmiany statusu");
    }
  };

  // Usuwanie wniosku
  const handleDeleteApplication = async (appId: number) => {
    if (!confirm("Czy na pewno chcesz usunąć ten wniosek? Tej operacji nie można cofnąć.")) return;

    setDeletingAppId(appId);
    try {
      // UWAGA: Endpoint DELETE może nie istnieć w backendzie
      // Będzie trzeba dodać DELETE /api/applications/{id}
      const response = await fetch(`${API_BASE}/api/applications/${appId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        alert("Wniosek usunięty pomyślnie!");
        setApplications(applications.filter(a => a.applicationId !== appId));
      } else {
        const errorData = await response.json();
        alert(`Błąd: ${errorData.message || "Nie udało się usunąć wniosku"}`);
      }
    } catch (err) {
      console.error("Błąd usuwania wniosku:", err);
      alert("Endpoint DELETE nie jest jeszcze dostępny w backendzie");
    } finally {
      setDeletingAppId(null);
    }
  };

  const resetForm = () => {
    setAppForm({
      categoryId: "",
      albumNr: "",
      title: "",
      content: "",
      status: "submitted",
    });
  };

  const openEditModal = (app: Application) => {
    setEditingApplication(app);
    setAppForm({
      categoryId: app.categoryId.toString(),
      albumNr: app.albumNr.toString(),
      title: app.title,
      content: app.content,
      status: app.status,
    });
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "submitted":
        return <span className="px-3 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-full text-sm font-medium flex items-center gap-1">
          <FaClock /> Oczekujący
        </span>;
      case "approved":
        return <span className="px-3 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-full text-sm font-medium flex items-center gap-1">
          <FaCheckCircle /> Zaakceptowany
        </span>;
      case "rejected":
        return <span className="px-3 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-full text-sm font-medium flex items-center gap-1">
          <FaTimesCircle /> Odrzucony
        </span>;
    }
  };

  const getStudentName = (albumNr: number) => {
  const student = students.find(s => Number(s.albumNr) === Number(albumNr));
  return student
    ? `${student.name} ${student.surname}`
    : `Album ${albumNr}`;
};

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.categoryId === categoryId);
    return category?.name || `Kategoria ${categoryId}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)] mb-4 mx-auto"></div>
          <p className="text-lg text-[var(--color-text-secondary)]">Ładowanie danych...</p>
        </div>
      </div>
    );
  }

  const submittedCount = applications.filter(a => a.status === "submitted").length;
  const acceptedCount = applications.filter(a => a.status === "approved").length;
  const rejectedCount = applications.filter(a => a.status === "rejected").length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <div className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-accent)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-accent)] mb-2">
              Zarządzanie Wnioskami
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Panel administratora - przeglądaj, akceptuj, odrzucaj i zarządzaj wnioskami studentów
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors font-semibold"
          >
            <FaPlus /> Dodaj Wniosek
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] rounded-lg p-4">
            <p className="text-[var(--color-accent)]">{error}</p>
          </div>
        )}

        {/* Filtry */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FaFilter /> Filtry i Wyszukiwanie
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              {showFilters ? "Ukryj" : "Pokaż"} filtry
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="">Wszystkie statusy</option>
                  <option value="submitted">Oczekujący</option>
                  <option value="approved">Zaakceptowany</option>
                  <option value="rejected">Odrzucony</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Kategoria</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="">Wszystkie kategorie</option>
                  {categories.map((cat) => (
                    <option key={cat.categoryId} value={cat.categoryId}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="">Wszyscy studenci</option>
                  {students.map((student, index) => (
                    <option key={`student-filter-${student.user_id}-${index}`} value={student.albumNr}>
                      {student.name} {student.surname}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Szukaj</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tytuł, treść..."
                    className="w-full px-3 py-2 pl-10 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                  <FaSearch className="absolute left-3 top-3 text-[var(--color-text-secondary)]" />
                </div>
              </div>
            </div>
          )}

          {(selectedStatus || selectedCategory || selectedStudent || searchTerm) && (
            <div className="mt-4 pt-4 border-t border-[var(--color-accent)]">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Znaleziono: <strong className="text-[var(--color-accent)]">{filteredApplications.length}</strong> wniosków
                <button
                  onClick={() => {
                    setSelectedStatus("");
                    setSelectedCategory("");
                    setSelectedStudent("");
                    setSearchTerm("");
                  }}
                  className="ml-4 text-[var(--color-accent)] hover:underline"
                >
                  Wyczyść filtry
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Wszystkie Wnioski
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{applications.length}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
              <FaClock className="text-[var(--color-accent)]" /> Oczekujące
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{submittedCount}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
              <FaCheckCircle className="text-[var(--color-accent)]" /> Zaakceptowane
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{acceptedCount}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
              <FaTimesCircle className="text-[var(--color-accent)]" /> Odrzucone
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{rejectedCount}</p>
          </div>
        </div>

        {/* Lista wniosków */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg overflow-hidden">
          <div className="bg-[var(--color-accent)] text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Lista Wniosków</h2>
          </div>

          {filteredApplications.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-2">
                Brak wniosków
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                Nie znaleziono żadnych wniosków spełniających kryteria wyszukiwania
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-accent)]/20">
              {filteredApplications.map((app) => (
                <div
                  key={app.applicationId}
                  className="p-6 hover:bg-[var(--color-bg)] transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{app.title}</h3>
                        {getStatusBadge(app.status)}
                      </div>
                      <div className="text-sm text-[var(--color-text-secondary)] space-y-1">
                        <p><strong>Student:</strong> {getStudentName(app.albumNr)} (Album: {app.albumNr})</p>
                        <p><strong>Kategoria:</strong> {getCategoryName(app.categoryId)}</p>
                        <p><strong>Utworzono:</strong> {formatDate(app.createdAt)}</p>
                        {app.updatedAt !== app.createdAt && (
                          <p><strong>Zaktualizowano:</strong> {formatDate(app.updatedAt)}</p>
                        )}
                      </div>
                      <p className="mt-3 text-sm line-clamp-2">{app.content}</p>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => setViewingApplication(app)}
                        className="px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded hover:bg-[var(--color-accent)] hover:text-white transition-colors text-sm"
                      >
                        Podgląd
                      </button>
                      <button
                        onClick={() => openEditModal(app)}
                        className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] transition-colors text-sm flex items-center gap-2"
                      >
                        <FaEdit /> Edytuj
                      </button>
                      {app.status === "submitted" && (
                        <>
                          <button
                            onClick={() => handleQuickStatusChange(app, "approved")}
                            className="px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded hover:bg-[var(--color-accent)] hover:text-white transition-colors text-sm flex items-center gap-2"
                          >
                            <FaCheckCircle /> Akceptuj
                          </button>
                          <button
                            onClick={() => handleQuickStatusChange(app, "rejected")}
                            className="px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded hover:bg-[var(--color-accent)] hover:text-white transition-colors text-sm flex items-center gap-2"
                          >
                            <FaTimesCircle /> Odrzuć
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteApplication(app.applicationId)}
                        disabled={deletingAppId === app.applicationId}
                        className="px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded hover:bg-[var(--color-accent)] hover:text-white transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        <FaTrash /> Usuń
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal podglądu */}
      {viewingApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[var(--color-accent)]">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-[var(--color-accent)] mb-2">
                  {viewingApplication.title}
                </h3>
                {getStatusBadge(viewingApplication.status)}
              </div>
              <button
                onClick={() => setViewingApplication(null)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                <p className="text-sm"><strong>Student:</strong> {getStudentName(viewingApplication.albumNr)}</p>
                <p className="text-sm"><strong>Kategoria:</strong> {getCategoryName(viewingApplication.categoryId)}</p>
                <p className="text-sm"><strong>Data utworzenia:</strong> {formatDate(viewingApplication.createdAt)}</p>
                {viewingApplication.updatedAt !== viewingApplication.createdAt && (
                  <p className="text-sm"><strong>Ostatnia aktualizacja:</strong> {formatDate(viewingApplication.updatedAt)}</p>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Treść wniosku:</h4>
                <div className="bg-[var(--color-bg)] p-4 rounded-lg whitespace-pre-wrap">
                  {viewingApplication.content}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setViewingApplication(null)}
                className="px-6 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-colors"
              >
                Zamknij
              </button>
              <button
                onClick={() => {
                  openEditModal(viewingApplication);
                  setViewingApplication(null);
                }}
                className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-2"
              >
                <FaEdit /> Edytuj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal dodawania */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--color-accent)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-[var(--color-accent)]">
                Dodaj Nowy Wniosek
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Student <span className="text-[var(--color-accent)]">*</span>
                  </label>
                  <select
                    value={appForm.albumNr}
                    onChange={(e) => setAppForm({ ...appForm, albumNr: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                    required
                  >
                    <option value="">Wybierz studenta</option>
                    {students.map((student, index) => (
                      <option key={`student-add-${student.user_id}-${index}`} value={student.albumNr}>
                        {student.name} {student.surname} (Album: {student.albumNr})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Kategoria <span className="text-[var(--color-accent)]">*</span>
                  </label>
                  <select
                    value={appForm.categoryId}
                    onChange={(e) => setAppForm({ ...appForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                    required
                  >
                    <option value="">Wybierz kategorię</option>
                    {categories.map((cat) => (
                      <option key={cat.categoryId} value={cat.categoryId}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tytuł <span className="text-[var(--color-accent)]">*</span>
                </label>
                <input
                  type="text"
                  value={appForm.title}
                  onChange={(e) => setAppForm({ ...appForm, title: e.target.value })}
                  placeholder="Tytuł wniosku"
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Treść <span className="text-[var(--color-accent)]">*</span>
                </label>
                <textarea
                  value={appForm.content}
                  onChange={(e) => setAppForm({ ...appForm, content: e.target.value })}
                  rows={8}
                  placeholder="Treść wniosku..."
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] resize-vertical"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddApplication}
                  className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-2"
                >
                  <FaSave /> Dodaj Wniosek
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal edycji */}
      {editingApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--color-accent)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-[var(--color-accent)]">
                Edytuj Wniosek
              </h3>
              <button
                onClick={() => {
                  setEditingApplication(null);
                  resetForm();
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--color-bg)] p-4 rounded-lg mb-4">
                <p className="text-sm">
                  <strong>Student:</strong> {getStudentName(editingApplication.albumNr)}
                </p>
                <p className="text-sm">
                  <strong>ID Wniosku:</strong> {editingApplication.applicationId}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Kategoria <span className="text-[var(--color-accent)]">*</span>
                </label>
                <select
                  value={appForm.categoryId}
                  onChange={(e) => setAppForm({ ...appForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.categoryId} value={cat.categoryId}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Status <span className="text-[var(--color-accent)]">*</span>
                </label>
                <select
                  value={appForm.status}
                  onChange={(e) => setAppForm({ ...appForm, status: e.target.value as ApplicationStatus })}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  required
                >
                  <option value="submitted">Oczekujący</option>
                  <option value="approved">Zaakceptowany</option>
                  <option value="rejected">Odrzucony</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tytuł <span className="text-[var(--color-accent)]">*</span>
                </label>
                <input
                  type="text"
                  value={appForm.title}
                  onChange={(e) => setAppForm({ ...appForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Treść <span className="text-[var(--color-accent)]">*</span>
                </label>
                <textarea
                  value={appForm.content}
                  onChange={(e) => setAppForm({ ...appForm, content: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)] resize-vertical"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setEditingApplication(null);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleEditApplication}
                  className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-2"
                >
                  <FaSave /> Zapisz Zmiany
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}