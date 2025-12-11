"use client";

import { useEffect, useState } from "react";
import {
  FaSearch,
  FaUser,
  FaUserShield,
  FaChalkboardTeacher,
  FaSync,
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

// Normalizacja danych użytkownika (backend może zwracać snake_case lub camelCase)
const normalizeUser = (rawUser: any): User => ({
  userId: rawUser.userId ?? rawUser.user_id ?? 0,
  name: rawUser.name ?? "",
  surname: rawUser.surname ?? "",
  email: rawUser.email ?? "",
  phoneNr: rawUser.phoneNr ?? rawUser.phone_nr,
  registrationAddress: rawUser.registrationAddress ?? rawUser.registration_address,
  postalAddress: rawUser.postalAddress ?? rawUser.postal_address,
  bankAccountNr: rawUser.bankAccountNr ?? rawUser.bank_account_nr,
  albumNr: rawUser.albumNr != null ? Number(rawUser.albumNr) : 
           rawUser.album_nr != null ? Number(rawUser.album_nr) : undefined,
  teachingStaffId: rawUser.teachingStaffId ?? rawUser.teaching_staff_id,
  administrativeStaffId: rawUser.administrativeStaffId ?? rawUser.administrative_staff_id,
  active: rawUser.active ?? true,
  role: rawUser.role ?? "student",
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";

export default function TeacherUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtry
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [albumSearch, setAlbumSearch] = useState("");
  
  // Tryb wyświetlania
  const [showOnlyMyStudents, setShowOnlyMyStudents] = useState(false);
  const [myStudentAlbumNrs, setMyStudentAlbumNrs] = useState<number[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchMyStudents();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [selectedRole, selectedStatus, searchTerm, albumSearch, users, showOnlyMyStudents, myStudentAlbumNrs]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Próbujemy pobrać wszystkich użytkowników
      const response = await fetch(`${API_BASE}/api/auth/users`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        
        // Debug
        console.log("=== DEBUG: Odpowiedź z /api/auth/users ===");
        console.log("Surowe dane:", data);
        
        // Normalizuj użytkowników (obsługa snake_case i camelCase)
        const rawUsers = data.users || [];
        const normalizedUsers = rawUsers.map(normalizeUser);
        
        console.log("Znormalizowani użytkownicy:", normalizedUsers);
        console.log("Studenci:", normalizedUsers.filter((u: User) => u.role === "student").length);
        console.log("Wykładowcy:", normalizedUsers.filter((u: User) => u.role === "teacher").length);
        console.log("Admini:", normalizedUsers.filter((u: User) => u.role === "admin").length);

        setUsers(normalizedUsers);
      } else {
        console.error("Błąd odpowiedzi:", response.status);
        toast.error("Nie udało się pobrać użytkowników");
      }
    } catch (error) {
      console.error("Błąd pobierania użytkowników:", error);
      toast.error("Błąd pobierania użytkowników");
    } finally {
      setLoading(false);
    }
  };

  // Pobierz listę "moich studentów" (przypisanych do zalogowanego wykładowcy)
  const fetchMyStudents = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/teacher/students`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const students = data.students || [];
        
        // Wyciągnij albumNr moich studentów
        const albumNrs = students.map((s: any) => {
          const albumNr = s.albumNr ?? s.album_nr;
          return albumNr != null ? Number(albumNr) : null;
        }).filter((nr: number | null) => nr !== null);
        
        console.log("=== DEBUG: Moi studenci ===");
        console.log("Album numbers:", albumNrs);
        
        setMyStudentAlbumNrs(albumNrs);
      } else {
        console.error("Nie udało się pobrać moich studentów:", response.status);
      }
    } catch (error) {
      console.error("Błąd pobierania moich studentów:", error);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Filtr "Tylko moi studenci"
    if (showOnlyMyStudents) {
      filtered = filtered.filter(
        (u) => u.role === "student" && u.albumNr && myStudentAlbumNrs.includes(u.albumNr)
      );
    }

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
      default:
        return role;
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "student":
        return <FaUser className="text-blue-400" />;
      case "teacher":
        return <FaChalkboardTeacher className="text-green-400" />;
      case "admin":
        return <FaUserShield className="text-purple-400" />;
      default:
        return <FaUser />;
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case "student":
        return "bg-blue-500/20 text-blue-400";
      case "teacher":
        return "bg-green-500/20 text-green-400";
      case "admin":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-gray-500/20 text-gray-400";
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
    return user.userId ? `UID: ${user.userId}` : "—";
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
              Użytkownicy
            </h1>

            <div className="flex gap-2">
              {/* Toggle "Tylko moi studenci" */}
              <button
                onClick={() => setShowOnlyMyStudents(!showOnlyMyStudents)}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  showOnlyMyStudents
                    ? "bg-green-600 text-white"
                    : "bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-text)]"
                }`}
                title={showOnlyMyStudents ? "Pokaż wszystkich" : "Pokaż tylko moich studentów"}
              >
                <FaUser /> 
                {showOnlyMyStudents ? "Moi studenci" : "Wszyscy"}
                {showOnlyMyStudents && ` (${myStudentAlbumNrs.length})`}
              </button>

              <button
                onClick={() => {
                  fetchUsers();
                  fetchMyStudents();
                }}
                className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition flex items-center gap-2"
                title="Odśwież listę"
              >
                <FaSync /> Odśwież
              </button>
            </div>
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
                <FaUser className="text-blue-400" />
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Studenci
                </h3>
              </div>
              <p className="text-3xl font-bold text-blue-400">
                {studentCount}
              </p>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <div className="flex items-center gap-2 mb-1">
                <FaChalkboardTeacher className="text-green-400" />
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Wykładowcy
                </h3>
              </div>
              <p className="text-3xl font-bold text-green-400">
                {teacherCount}
              </p>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <div className="flex items-center gap-2 mb-1">
                <FaUserShield className="text-purple-400" />
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Administratorzy
                </h3>
              </div>
              <p className="text-3xl font-bold text-purple-400">
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
                  <option value="student">Studenci ({studentCount})</option>
                  <option value="teacher">Wykładowcy ({teacherCount})</option>
                  <option value="admin">Administratorzy ({adminCount})</option>
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
                  Nie znaleziono użytkowników spełniających kryteria wyszukiwania
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-accent)]/10">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Użytkownik</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-center py-3 px-4 font-semibold">Rola</th>
                      <th className="text-center py-3 px-4 font-semibold">ID</th>
                      <th className="text-center py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr
                        key={user.userId || user.email || index}
                        className="border-b border-[var(--color-accent)]/20 hover:bg-[var(--color-bg)] transition"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {getRoleIcon(user.role)}
                            <div>
                              <div className="font-semibold">
                                {user.name} {user.surname}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                          {user.email}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center text-xs text-[var(--color-text-secondary)]">
                          {getUserId(user)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.active
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {user.active ? "Aktywny" : "Nieaktywny"}
                          </span>
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