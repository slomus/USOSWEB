"use client";

import { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaSearch, FaUser, FaUserShield, FaChalkboardTeacher } from "react-icons/fa";
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

type UserForm = {
  name: string;
  surname: string;
  email: string;
  password: string;
  phone_nr: string;
  registration_address: string;
  postal_address: string;
  bank_account_nr: string;
  pesel: string;
  role: UserRole;
  album_nr?: string;
  degree?: string;
  title?: string;
  faculty_id?: number;
  email_app_password?: string;
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
  
  // Modalne okna
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  
  // Formularz
  const [userForm, setUserForm] = useState<UserForm>({
    name: "",
    surname: "",
    email: "",
    password: "",
    phone_nr: "",
    registration_address: "",
    postal_address: "",
    bank_account_nr: "",
    pesel: "",
    role: "student",
    album_nr: "",
  });

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
        console.log("Users data:", data);
        console.log("First user:", data.users?.[0]);
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
      filtered = filtered.filter(u => u.role === selectedRole);
    }

    if (selectedStatus) {
      const isActive = selectedStatus === "active";
      filtered = filtered.filter(u => u.active === isActive);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        u =>
          u.name.toLowerCase().includes(term) ||
          u.surname.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      );
    }

    if (albumSearch && albumSearch.trim() !== "") {
      filtered = filtered.filter(u => 
        u.albumNr?.toString().includes(albumSearch)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleAddUser = async () => {
    if (!userForm.name || !userForm.surname || !userForm.email || !userForm.password) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    // Walidacja dla studenta - wymagany numer albumu
    if (userForm.role === "student" && !userForm.album_nr) {
      toast.error("Numer albumu jest wymagany dla studenta");
      return;
    }

    try {
      const requestBody: any = {
        name: userForm.name,
        surname: userForm.surname,
        email: userForm.email,
        password: userForm.password,
        phone_nr: userForm.phone_nr,
        registration_address: userForm.registration_address,
        postal_address: userForm.postal_address,
        bank_account_nr: userForm.bank_account_nr,
        pesel: userForm.pesel,
        role: userForm.role,
        faculty_id: userForm.faculty_id || 1,
      };

      // Dodaj specyficzne pola w zależności od roli
      if (userForm.role === "student" && userForm.album_nr) {
        requestBody.album_nr = parseInt(userForm.album_nr);
      } else if (userForm.role === "teacher") {
        requestBody.degree = userForm.degree || "";
        requestBody.title = userForm.title || "";
        requestBody.email_app_password = userForm.email_app_password || "";
      } else if (userForm.role === "admin") {
        requestBody.admin_role = "admin";
      }

      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        toast.success("Użytkownik został dodany pomyślnie!");
        setShowAddModal(false);
        resetForm();
        fetchUsers();
      } else {
        const errorData = await response.json();
        toast.error(`Błąd: ${errorData.message || "Nie udało się dodać użytkownika"}`);
      }
    } catch (error) {
      console.error("Błąd dodawania użytkownika:", error);
      toast.error("Wystąpił błąd podczas dodawania użytkownika");
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`${API_BASE}/api/auth/edit/${editingUser.userId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: editingUser.userId,
          name: userForm.name,
          surname: userForm.surname,
          email: userForm.email,
          phone_nr: userForm.phone_nr || "",
          registration_address: userForm.registration_address || "",
          postal_address: userForm.postal_address || "",
          bank_account_nr: userForm.bank_account_nr || "",
          ...(userForm.password && { password: userForm.password }),
        }),
      });

      if (response.ok) {
        toast.success("Użytkownik został zaktualizowany!");
        setEditingUser(null);
        resetForm();
        fetchUsers();
      } else {
        const errorData = await response.json();
        toast.error(`Błąd: ${errorData.message || "Nie udało się zaktualizować użytkownika"}`);
      }
    } catch (error) {
      console.error("Błąd edycji użytkownika:", error);
      toast.error("Wystąpił błąd podczas edycji użytkownika");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Czy na pewno chcesz usunąć tego użytkownika?")) return;

    try {
      setDeletingUserId(userId);
      const response = await fetch(`${API_BASE}/api/auth/user/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Użytkownik został usunięty!");
        fetchUsers();
      } else {
        const errorData = await response.json();
        toast.error(`Błąd: ${errorData.message || "Nie udało się usunąć użytkownika"}`);
      }
    } catch (error) {
      console.error("Błąd usuwania użytkownika:", error);
      toast.error("Wystąpił błąd podczas usuwania użytkownika");
    } finally {
      setDeletingUserId(null);
    }
  };

  const openEditModal = async (user: User) => {
    try {
      // Pobierz szczegółowe dane użytkownika
      const response = await fetch(`${API_BASE}/api/auth/edit/${user.userId}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setEditingUser(user);
        setUserForm({
          name: data.name || "",
          surname: data.surname || "",
          email: data.email || "",
          password: "", // Nie pobieramy hasła
          phone_nr: data.phoneNr || data.phone_nr || "",
          registration_address: data.registrationAddress || data.registration_address || "",
          postal_address: data.postalAddress || data.postal_address || "",
          bank_account_nr: data.bankAccountNr || data.bank_account_nr || "",
          pesel: "",
          role: user.role,
        });
      } else {
        toast.error("Nie udało się pobrać danych użytkownika");
      }
    } catch (error) {
      console.error("Błąd pobierania danych użytkownika:", error);
      toast.error("Błąd pobierania danych użytkownika");
    }
  };

  const resetForm = () => {
    setUserForm({
      name: "",
      surname: "",
      email: "",
      password: "",
      phone_nr: "",
      registration_address: "",
      postal_address: "",
      bank_account_nr: "",
      pesel: "",
      role: "student",
      album_nr: "",
    });
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
  const studentCount = users.filter(u => u.role === "student").length;
  const teacherCount = users.filter(u => u.role === "teacher").length;
  const adminCount = users.filter(u => u.role === "admin").length;

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
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition flex items-center gap-2"
            >
              <FaPlus /> Dodaj Użytkownika
            </button>
          </div>

          {/* Statystyki */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
                Wszyscy Użytkownicy
              </h3>
              <p className="text-3xl font-bold text-[var(--color-accent)]">{totalUsers}</p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <div className="flex items-center gap-2 mb-1">
                <FaUser className="text-[var(--color-accent)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Studenci
                </h3>
              </div>
              <p className="text-3xl font-bold text-[var(--color-accent)]">{studentCount}</p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <div className="flex items-center gap-2 mb-1">
                <FaChalkboardTeacher className="text-[var(--color-accent)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Wykładowcy
                </h3>
              </div>
              <p className="text-3xl font-bold text-[var(--color-accent)]">{teacherCount}</p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <div className="flex items-center gap-2 mb-1">
                <FaUserShield className="text-[var(--color-accent)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Administratorzy
                </h3>
              </div>
              <p className="text-3xl font-bold text-[var(--color-accent)]">{adminCount}</p>
            </div>
          </div>

          {/* Filtry i Wyszukiwanie */}
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-6 border border-[var(--color-accent)]">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaSearch /> Filtry i Wyszukiwanie
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Wyszukaj po imieniu/nazwisku/email</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Szukaj..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nr albumu</label>
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

          {/* Lista Użytkowników - KOMPAKTOWA */}
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
                      <th className="text-center py-3 px-4 font-semibold">Nr albumu/ID</th>
                      <th className="text-center py-3 px-4 font-semibold">Status</th>
                      <th className="text-center py-3 px-4 font-semibold">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr
                        key={user.userId || user.email || index}
                        className="border-b border-[var(--color-accent)]/20 hover:bg-[var(--color-bg-hover)] transition"
                      >
                        <td className="py-2 px-4">
                          <div className="font-semibold">{user.name} {user.surname}</div>
                        </td>
                        <td className="py-2 px-4 text-[var(--color-text-secondary)]">
                          {user.email}
                        </td>
                        <td className="py-2 px-4">
                          <span className="text-xs">{getRoleLabel(user.role)}</span>
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
                        <td className="py-2 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded transition"
                              title="Edytuj"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.userId)}
                              disabled={deletingUserId === user.userId}
                              className="p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] rounded transition disabled:opacity-50"
                              title="Usuń"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Dodawania Użytkownika */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">Dodaj Użytkownika</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                  >
                    <FaTimes size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Imię <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={userForm.name}
                        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Nazwisko <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={userForm.surname}
                        onChange={(e) => setUserForm({ ...userForm, surname: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Hasło <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      PESEL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={userForm.pesel}
                      onChange={(e) => setUserForm({ ...userForm, pesel: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Rola <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Wykładowca</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  {/* Pole dla numeru albumu - tylko dla studentów */}
                  {userForm.role === "student" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Numer albumu <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={userForm.album_nr || ""}
                        onChange={(e) => setUserForm({ ...userForm, album_nr: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                        placeholder="Wprowadź numer albumu"
                        required
                      />
                    </div>
                  )}

                  {/* Pola dla wykładowcy */}
                  {userForm.role === "teacher" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Stopień naukowy</label>
                          <input
                            type="text"
                            value={userForm.degree || ""}
                            onChange={(e) => setUserForm({ ...userForm, degree: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                            placeholder="np. dr, prof."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Tytuł</label>
                          <input
                            type="text"
                            value={userForm.title || ""}
                            onChange={(e) => setUserForm({ ...userForm, title: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                            placeholder="np. inż., hab."
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Hasło aplikacji email</label>
                        <input
                          type="password"
                          value={userForm.email_app_password || ""}
                          onChange={(e) => setUserForm({ ...userForm, email_app_password: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                          placeholder="Hasło do aplikacji email (opcjonalne)"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">Telefon</label>
                    <input
                      type="text"
                      value={userForm.phone_nr}
                      onChange={(e) => setUserForm({ ...userForm, phone_nr: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Adres zameldowania</label>
                    <input
                      type="text"
                      value={userForm.registration_address}
                      onChange={(e) => setUserForm({ ...userForm, registration_address: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Adres korespondencyjny</label>
                    <input
                      type="text"
                      value={userForm.postal_address}
                      onChange={(e) => setUserForm({ ...userForm, postal_address: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Numer konta bankowego</label>
                    <input
                      type="text"
                      value={userForm.bank_account_nr}
                      onChange={(e) => setUserForm({ ...userForm, bank_account_nr: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleAddUser}
                    className="flex-1 px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2"
                  >
                    <FaSave /> Dodaj Użytkownika
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:opacity-90 transition"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Edycji Użytkownika */}
          {editingUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">Edytuj Użytkownika</h2>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      resetForm();
                    }}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                  >
                    <FaTimes size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Imię</label>
                      <input
                        type="text"
                        value={userForm.name}
                        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Nazwisko</label>
                      <input
                        type="text"
                        value={userForm.surname}
                        onChange={(e) => setUserForm({ ...userForm, surname: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Nowe hasło (opcjonalne)</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      placeholder="Pozostaw puste, jeśli nie chcesz zmieniać"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Telefon</label>
                    <input
                      type="text"
                      value={userForm.phone_nr}
                      onChange={(e) => setUserForm({ ...userForm, phone_nr: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Adres zameldowania</label>
                    <input
                      type="text"
                      value={userForm.registration_address}
                      onChange={(e) => setUserForm({ ...userForm, registration_address: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Adres korespondencyjny</label>
                    <input
                      type="text"
                      value={userForm.postal_address}
                      onChange={(e) => setUserForm({ ...userForm, postal_address: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Numer konta bankowego</label>
                    <input
                      type="text"
                      value={userForm.bank_account_nr}
                      onChange={(e) => setUserForm({ ...userForm, bank_account_nr: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleEditUser}
                    className="flex-1 px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2"
                  >
                    <FaSave /> Zapisz Zmiany
                  </button>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:opacity-90 transition"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}