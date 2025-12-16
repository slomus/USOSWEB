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

type Faculty = {
  facultyId: number;
  name: string;
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
  // Pola dla wykładowcy
  degree?: string;
  title?: string;
  faculty_id?: number;
  email_app_password?: string;
  // Pola dla admina
  admin_role?: string;
};

import { getApiBaseUrl } from "@/app/config/api";

const API_BASE = getApiBaseUrl();

export default function AdminAccountManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
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
    degree: "",
    title: "",
    faculty_id: 1,
    admin_role: "",
  });

  useEffect(() => {
    fetchUsers();
    fetchFaculties();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [selectedRole, selectedStatus, searchTerm, albumSearch, users]);

  const fetchFaculties = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/faculties`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setFaculties(data.faculties || []);
      }
    } catch (error) {
      console.error("Błąd pobierania wydziałów:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/auth/users`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Users data:", data);
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
    // Walidacja podstawowych pól
    if (!userForm.name || !userForm.surname || !userForm.email || !userForm.password || !userForm.pesel) {
      toast.error("Wypełnij wszystkie wymagane pola (imię, nazwisko, email, hasło, PESEL)");
      return;
    }

    // Walidacja dla wykładowcy
    if (userForm.role === "teacher") {
      if (!userForm.degree || !userForm.title || !userForm.faculty_id) {
        toast.error("Dla wykładowcy wymagane są: stopień naukowy, tytuł i wydział");
        return;
      }
    }

    // Walidacja dla admina
    if (userForm.role === "admin") {
      if (!userForm.admin_role || !userForm.faculty_id) {
        toast.error("Dla administratora wymagane są: rola administracyjna i wydział");
        return;
      }
    }

    try {
      // Budowanie ciała żądania zgodnie z API
      const requestBody: Record<string, unknown> = {
        name: userForm.name,
        surname: userForm.surname,
        email: userForm.email,
        password: userForm.password,
        pesel: userForm.pesel,
        phone_nr: userForm.phone_nr || "",
        registration_address: userForm.registration_address || "",
        postal_address: userForm.postal_address || "",
        bank_account_nr: userForm.bank_account_nr || "",
        role: userForm.role,
      };

      // Dodaj pola specyficzne dla roli
      if (userForm.role === "teacher") {
        requestBody.degree = userForm.degree;
        requestBody.title = userForm.title;
        requestBody.faculty_id = userForm.faculty_id;
        if (userForm.email_app_password) {
          requestBody.email_app_password = userForm.email_app_password;
        }
      } else if (userForm.role === "admin") {
        requestBody.admin_role = userForm.admin_role;
        requestBody.faculty_id = userForm.faculty_id;
      }
      // Dla studenta - nie dodajemy żadnych specjalnych pól
      // Backend automatycznie wygeneruje album_nr

      console.log("Wysyłane dane rejestracji:", requestBody);

      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      console.log("Odpowiedź API:", responseData);

      // Backend zwraca success: true/false w body, nie tylko status HTTP
      if (responseData.success === true) {
        let successMessage = "Użytkownik został dodany pomyślnie!";
        
        // Pokaż user_id dla nowego użytkownika
        if (responseData.user_id) {
          successMessage = `Użytkownik został dodany! ID: ${responseData.user_id}`;
        }
        
        toast.success(successMessage);
        setShowAddModal(false);
        resetForm();
        fetchUsers();
      } else {
        console.error("Błąd API:", responseData);
        toast.error(`Błąd: ${responseData.message || "Nie udało się dodać użytkownika"}`);
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
          password: "",
          phone_nr: data.phoneNr || data.phone_nr || "",
          registration_address: data.registrationAddress || data.registration_address || "",
          postal_address: data.postalAddress || data.postal_address || "",
          bank_account_nr: data.bankAccountNr || data.bank_account_nr || "",
          pesel: "",
          role: user.role,
          degree: "",
          title: "",
          faculty_id: 1,
          admin_role: "",
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
      degree: "",
      title: "",
      faculty_id: 1,
      admin_role: "",
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
              <p className="text-3xl font-bold">{totalUsers}</p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1 flex items-center gap-2">
                <FaUser /> Studenci
              </h3>
              <p className="text-3xl font-bold">{studentCount}</p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1 flex items-center gap-2">
                <FaChalkboardTeacher /> Wykładowcy
              </h3>
              <p className="text-3xl font-bold">{teacherCount}</p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-accent)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1 flex items-center gap-2">
                <FaUserShield /> Administratorzy
              </h3>
              <p className="text-3xl font-bold">{adminCount}</p>
            </div>
          </div>

          {/* Filtry */}
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 mb-6 border border-[var(--color-accent)]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Szukaj</label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Imię, nazwisko, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nr albumu</label>
                <input
                  type="text"
                  placeholder="Szukaj po albumie..."
                  value={albumSearch}
                  onChange={(e) => setAlbumSearch(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
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
              <div className="p-8 text-center text-[var(--color-text-secondary)]">
                Brak użytkowników do wyświetlenia
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-bg)] border-b border-[var(--color-accent)]">
                    <tr>
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">Imię i Nazwisko</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Rola</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.userId}
                        className="border-b border-[var(--color-accent)]/20 hover:bg-[var(--color-bg)]"
                      >
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                          {getUserId(user)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {user.name} {user.surname}
                        </td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded text-xs bg-[var(--color-accent)]/20">
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              user.active
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {user.active ? "Aktywny" : "Nieaktywny"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 rounded"
                              title="Edytuj"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.userId)}
                              disabled={deletingUserId === user.userId}
                              className="p-2 text-red-500 hover:bg-red-500/20 rounded disabled:opacity-50"
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
              <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">Dodaj Nowego Użytkownika</h3>
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
                  {/* Podstawowe dane */}
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

                  {/* Informacja dla studenta */}
                  {userForm.role === "student" && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-sm text-blue-400">
                        Numer albumu zostanie wygenerowany automatycznie przez system.
                      </p>
                    </div>
                  )}

                  {/* Pola dla wykładowcy */}
                  {userForm.role === "teacher" && (
                    <>
                      <div className="border-t border-[var(--color-accent)]/30 pt-4 mt-4">
                        <h4 className="font-semibold mb-4">Dane wykładowcy</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Stopień naukowy <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={userForm.degree || ""}
                              onChange={(e) => setUserForm({ ...userForm, degree: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                              placeholder="np. dr, dr hab., prof."
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Tytuł <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={userForm.title || ""}
                              onChange={(e) => setUserForm({ ...userForm, title: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                              placeholder="np. Adiunkt, Profesor"
                              required
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium mb-2">
                            Wydział <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={userForm.faculty_id || 1}
                            onChange={(e) => setUserForm({ ...userForm, faculty_id: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                            required
                          >
                            {faculties.length > 0 ? (
                              faculties.map((faculty) => (
                                <option key={faculty.facultyId} value={faculty.facultyId}>
                                  {faculty.name}
                                </option>
                              ))
                            ) : (
                              <>
                                <option value={1}>Wydział Informatyki</option>
                                <option value={2}>Wydział Matematyki</option>
                                <option value={3}>Wydział Fizyki</option>
                                <option value={4}>Wydział Chemii</option>
                              </>
                            )}
                          </select>
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium mb-2">Hasło aplikacji email</label>
                          <input
                            type="password"
                            value={userForm.email_app_password || ""}
                            onChange={(e) => setUserForm({ ...userForm, email_app_password: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                            placeholder="Opcjonalne - dla integracji email"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Pola dla admina */}
                  {userForm.role === "admin" && (
                    <>
                      <div className="border-t border-[var(--color-accent)]/30 pt-4 mt-4">
                        <h4 className="font-semibold mb-4">Dane administratora</h4>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Rola administracyjna <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={userForm.admin_role || ""}
                            onChange={(e) => setUserForm({ ...userForm, admin_role: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                            required
                          >
                            <option value="">Wybierz rolę...</option>
                            <option value="Dziekan">Dziekan</option>
                            <option value="Prodziekan">Prodziekan</option>
                            <option value="Kierownik Dziekanatu">Kierownik Dziekanatu</option>
                            <option value="Sekretarz">Sekretarz</option>
                            <option value="Administrator IT">Administrator IT</option>
                            <option value="coordinator">Koordynator</option>
                          </select>
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium mb-2">
                            Wydział <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={userForm.faculty_id || 1}
                            onChange={(e) => setUserForm({ ...userForm, faculty_id: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                            required
                          >
                            {faculties.length > 0 ? (
                              faculties.map((faculty) => (
                                <option key={faculty.facultyId} value={faculty.facultyId}>
                                  {faculty.name}
                                </option>
                              ))
                            ) : (
                              <>
                                <option value={1}>Wydział Informatyki</option>
                                <option value={2}>Wydział Matematyki</option>
                                <option value={3}>Wydział Fizyki</option>
                                <option value={4}>Wydział Chemii</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Dodatkowe dane kontaktowe */}
                  <div className="border-t border-[var(--color-accent)]/30 pt-4 mt-4">
                    <h4 className="font-semibold mb-4">Dane kontaktowe (opcjonalne)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Telefon</label>
                        <input
                          type="text"
                          value={userForm.phone_nr}
                          onChange={(e) => setUserForm({ ...userForm, phone_nr: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                          placeholder="+48123456789"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Nr konta bankowego</label>
                        <input
                          type="text"
                          value={userForm.bank_account_nr}
                          onChange={(e) => setUserForm({ ...userForm, bank_account_nr: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2">Adres zameldowania</label>
                      <input
                        type="text"
                        value={userForm.registration_address}
                        onChange={(e) => setUserForm({ ...userForm, registration_address: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      />
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2">Adres korespondencyjny</label>
                      <input
                        type="text"
                        value={userForm.postal_address}
                        onChange={(e) => setUserForm({ ...userForm, postal_address: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)]"
                      />
                    </div>
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
              <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">Edytuj Użytkownika</h3>
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

                <div className="mb-4 p-3 bg-[var(--color-accent)]/10 rounded-lg">
                  <p className="text-sm">
                    Edycja użytkownika: <strong>{editingUser.name} {editingUser.surname}</strong> ({getRoleLabel(editingUser.role)})
                  </p>
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