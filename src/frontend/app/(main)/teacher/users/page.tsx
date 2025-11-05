"use client";

import { useEffect, useState } from "react";
import { FaSearch, FaFilter, FaUser, FaUserShield, FaChalkboardTeacher, FaTimes } from "react-icons/fa";

type UserRole = "student" | "teacher" | "admin";

type User = {
  user_id: number;
  name: string;
  surname: string;
  email: string;
  phone_nr?: string;
  registration_address?: string;
  postal_address?: string;
  bank_account_nr?: string;
  album_nr?: number;
  active: boolean;
  role: UserRole;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

export default function TeacherUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filtry
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal podglądu
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  // Pobieranie wszystkich użytkowników
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/auth/users`, {
          credentials: "include",
        });
        
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
          setFilteredUsers(data.users || []);
        } else {
          setError("Nie udało się pobrać listy użytkowników");
        }
      } catch (err) {
        console.error("Błąd pobierania użytkowników:", err);
        setError("Wystąpił błąd podczas pobierania danych");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filtrowanie użytkowników
  useEffect(() => {
    let filtered = [...users];

    if (selectedRole) {
      filtered = filtered.filter(u => u.role === selectedRole);
    }

    if (selectedStatus) {
      const isActive = selectedStatus === "active";
      filtered = filtered.filter(u => u.active === isActive);
    }

    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.album_nr && u.album_nr.toString().includes(searchTerm))
      );
    }

    setFilteredUsers(filtered);
  }, [selectedRole, selectedStatus, searchTerm, users]);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "student":
        return <span className="px-3 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-full text-sm font-medium flex items-center gap-1">
          <FaUser /> Student
        </span>;
      case "teacher":
        return <span className="px-3 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-full text-sm font-medium flex items-center gap-1">
          <FaChalkboardTeacher /> Wykładowca
        </span>;
      case "admin":
        return <span className="px-3 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-full text-sm font-medium flex items-center gap-1">
          <FaUserShield /> Administrator
        </span>;
    }
  };

  const getStatusBadge = (active: boolean) => {
    return active ? (
      <span className="px-3 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-full text-sm font-medium">
        Aktywny
      </span>
    ) : (
      <span className="px-3 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)] rounded-full text-sm font-medium">
        Nieaktywny
      </span>
    );
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

  const studentCount = users.filter(u => u.role === "student").length;
  const teacherCount = users.filter(u => u.role === "teacher").length;
  const adminCount = users.filter(u => u.role === "admin").length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <div className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-accent)] px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-accent)] mb-2">
              Użytkownicy Systemu
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Przeglądaj listę użytkowników w systemie
            </p>
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rola</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="">Wszystkie role</option>
                  <option value="student">Student</option>
                  <option value="teacher">Wykładowca</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="">Wszystkie statusy</option>
                  <option value="active">Aktywny</option>
                  <option value="inactive">Nieaktywny</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Szukaj</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Imię, nazwisko, email, album..."
                    className="w-full px-3 py-2 pl-10 border border-[var(--color-accent)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                  <FaSearch className="absolute left-3 top-3 text-[var(--color-text-secondary)]" />
                </div>
              </div>
            </div>
          )}

          {(selectedRole || selectedStatus || searchTerm) && (
            <div className="mt-4 pt-4 border-t border-[var(--color-accent)]">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Znaleziono: <strong className="text-[var(--color-accent)]">{filteredUsers.length}</strong> użytkowników
                <button
                  onClick={() => {
                    setSelectedRole("");
                    setSelectedStatus("");
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
              Wszyscy Użytkownicy
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{users.length}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
              <FaUser className="text-[var(--color-accent)]" /> Studenci
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{studentCount}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
              <FaChalkboardTeacher className="text-[var(--color-accent)]" /> Wykładowcy
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{teacherCount}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-accent)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
              <FaUserShield className="text-[var(--color-accent)]" /> Administratorzy
            </h3>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{adminCount}</p>
          </div>
        </div>

        {/* Lista użytkowników */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-lg overflow-hidden">
          <div className="bg-[var(--color-accent)] text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Lista Użytkowników</h2>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-[var(--color-accent)] mb-2">
                Brak użytkowników
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                Nie znaleziono żadnych użytkowników spełniających kryteria wyszukiwania
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-accent)]/20">
              {filteredUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="p-6 hover:bg-[var(--color-bg)] transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{user.name} {user.surname}</h3>
                        {getRoleBadge(user.role)}
                        {getStatusBadge(user.active)}
                      </div>
                      <div className="text-sm text-[var(--color-text-secondary)] space-y-1">
                        <p><strong>Email:</strong> {user.email}</p>
                        {user.album_nr && <p><strong>Nr albumu:</strong> {user.album_nr}</p>}
                        {user.phone_nr && <p><strong>Telefon:</strong> {user.phone_nr}</p>}
                        <p><strong>ID:</strong> {user.user_id}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => setViewingUser(user)}
                        className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] transition-colors text-sm"
                      >
                        Podgląd
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
      {viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[var(--color-accent)]">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-[var(--color-accent)] mb-2">
                  {viewingUser.name} {viewingUser.surname}
                </h3>
                <div className="flex gap-2">
                  {getRoleBadge(viewingUser.role)}
                  {getStatusBadge(viewingUser.active)}
                </div>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Dane podstawowe</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <p><strong>ID:</strong> {viewingUser.user_id}</p>
                  <p><strong>Email:</strong> {viewingUser.email}</p>
                  {viewingUser.album_nr && <p><strong>Nr albumu:</strong> {viewingUser.album_nr}</p>}
                  {viewingUser.phone_nr && <p><strong>Telefon:</strong> {viewingUser.phone_nr}</p>}
                </div>
              </div>

              {(viewingUser.registration_address || viewingUser.postal_address) && (
                <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">Dane adresowe</h4>
                  <div className="space-y-2 text-sm">
                    {viewingUser.registration_address && (
                      <p><strong>Adres zamieszkania:</strong> {viewingUser.registration_address}</p>
                    )}
                    {viewingUser.postal_address && (
                      <p><strong>Adres korespondencyjny:</strong> {viewingUser.postal_address}</p>
                    )}
                  </div>
                </div>
              )}

              {viewingUser.bank_account_nr && (
                <div className="bg-[var(--color-bg)] p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">Dane finansowe</h4>
                  <p className="text-sm"><strong>Numer konta:</strong> {viewingUser.bank_account_nr}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setViewingUser(null)}
                className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}