"use client";

import { useEffect, useState } from "react";

import {
  FaSearch,
  FaUser,
  FaUserShield,
  FaChalkboardTeacher,
} from "react-icons/fa";

import { toast } from "react-toastify";

type UserRole = "student" | "teacher" | "admin";

type User = {
  userId: number;

  name: string;

  surname: string;

  email: string;

  phoneNr?: string;

  registrationAddress?: string;

  postalAddress?: string;

  bankAccountNr?: string;

  albumNr?: number;

  teachingStaffId?: number;

  administrativeStaffId?: number;

  active: boolean;

  role: UserRole;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

export default function AdminAccountManagementPage() {
  const [users, setUsers] = useState<User[]>([]);

  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);

  // Filtry

  const [selectedRole, setSelectedRole] = useState<string>("");

  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState("");

  const [albumSearch, setAlbumSearch] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [selectedRole, selectedStatus, searchTerm, albumSearch, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/api/auth/users`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        setUsers(data.users || []);
      } else {
        toast.error("Nie udało się pobrać użytkowników");
      }
    } catch (error) {
      console.error("Błąd pobierania użytkowników:", error);

      toast.error("Błąd pobierania użytkowników");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (selectedRole) {
      filtered = filtered.filter((u) => u.role === selectedRole);
    }

    if (selectedStatus) {
      const isActive = selectedStatus === "active";

      filtered = filtered.filter((u) => u.active === isActive);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();

      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.surname.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      );
    }

    if (albumSearch && albumSearch.trim() !== "") {
      filtered = filtered.filter((u) =>
        u.albumNr?.toString().includes(albumSearch)
      );
    }

    setFilteredUsers(filtered);
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "student":
        return "Student";
      case "teacher":
        return "Wykładowca";
      case "admin":
        return "Administrator";
    }
  };

  const getUserId = (user: User) => {
    if (user.role === "student" && user.albumNr) {
      return `Album: ${user.albumNr}`;
    } else if (user.role === "teacher" && user.teachingStaffId) {
      return `ID: ${user.teachingStaffId}`;
    } else if (user.role === "admin" && user.administrativeStaffId) {
      return `ID: ${user.administrativeStaffId}`;
    }

    return user.userId ? `UID: ${user.userId}` : "Brak ID";
  };

  // Statystyki

  const totalUsers = users.length;

  const studentCount = users.filter((u) => u.role === "student").length;

  const teacherCount = users.filter((u) => u.role === "teacher").length;

  const adminCount = users.filter((u) => u.role === "admin").length;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] items-center justify-center">
        <div className="text-xl">Ładowanie użytkowników...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex-1 flex flex-col">
        <main className="p-6 max-w-7xl mx-auto w-full pt-24">
          {/* Nagłówek */}

          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold border-b border-[var(--color-accent)] pb-4">
              Zarządzanie Użytkownikami
            </h1>
          </div>

          {/* Statystyki */}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
                Wszyscy Użytkownicy
              </h3>

              <p className="text-3xl font-bold text-[var(--color-accent)]">
                {totalUsers}
              </p>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <div className="flex items-center gap-2 mb-1">
                <FaUser className="text-[var(--color-accent)]" />

                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Studenci
                </h3>
              </div>

              <p className="text-3xl font-bold text-[var(--color-accent)]">
                {studentCount}
              </p>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <div className="flex items-center gap-2 mb-1">
                <FaChalkboardTeacher className="text-[var(--color-accent)]" />

                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Wykładowcy
                </h3>
              </div>

              <p className="text-3xl font-bold text-[var(--color-accent)]">
                {teacherCount}
              </p>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <div className="flex items-center gap-2 mb-1">
                <FaUserShield className="text-[var(--color-accent)]" />

                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Administratorzy
                </h3>
              </div>

              <p className="text-3xl font-bold text-[var(--color-accent)]">
                {adminCount}
              </p>
            </div>
          </div>

          {/* Filtry i Wyszukiwanie */}

          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-6 border border-[var(--color-accent)]">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaSearch /> Filtry i Wyszukiwanie
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Wyszukaj po imieniu/nazwisku/email
                </label>

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Szukaj..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Nr albumu
                </label>

                <input
                  type="text"
                  value={albumSearch}
                  onChange={(e) => setAlbumSearch(e.target.value)}
                  placeholder="Nr albumu..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rola</label>

                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
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
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="">Wszystkie statusy</option>

                  <option value="active">Aktywny</option>

                  <option value="inactive">Nieaktywny</option>
                </select>
              </div>
            </div>

            <div className="mt-4 text-sm text-[var(--color-text-secondary)]">
              Znaleziono: {filteredUsers.length} użytkowników
            </div>
          </div>

          {/* Lista Użytkowników */}

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
                  Nie znaleziono użytkowników spełniających kryteria
                  wyszukiwania
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-accent)]/10">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">
                        Użytkownik
                      </th>

                      <th className="text-left py-3 px-4 font-semibold">
                        Email
                      </th>

                      <th className="text-center py-3 px-4 font-semibold">
                        Rola
                      </th>

                      <th className="text-center py-3 px-4 font-semibold">
                        Nr albumu/ID
                      </th>

                      <th className="text-center py-3 px-4 font-semibold">
                        Status
                      </th>

                      <th className="text-center py-3 px-4 font-semibold">
                        Telefon
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr
                        key={user.userId || user.email || index}
                        className="border-b border-[var(--color-accent)]/20 hover:bg-[var(--color-bg-hover)] transition"
                      >
                        <td className="py-2 px-4">
                          <div className="font-semibold">
                            {user.name} {user.surname}
                          </div>
                        </td>

                        <td className="py-2 px-4 text-[var(--color-text-secondary)]">
                          {user.email}
                        </td>

                        <td className="py-2 px-4">
                          <span className="text-xs">
                            {getRoleLabel(user.role)}
                          </span>
                        </td>

                        <td className="py-2 px-4 text-center text-xs">
                          {getUserId(user)}
                        </td>

                        <td className="py-2 px-4 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.active
                                ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {user.active ? "Aktywny" : "Nieaktywny"}
                          </span>
                        </td>

                        <td className="py-2 px-4 text-center text-sm">
                          {user.phoneNr || "Brak"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
