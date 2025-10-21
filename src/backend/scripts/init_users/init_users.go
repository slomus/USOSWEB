package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"
)

type RegisterRequest struct {
	Email               string `json:"email"`
	Password            string `json:"password"`
	Name                string `json:"name"`
	Surname             string `json:"surname"`
	Role                string `json:"role"`
	PESEL               string `json:"pesel,omitempty"`
	PhoneNr             string `json:"phone_nr,omitempty"`
	PostalAddress       string `json:"postal_address,omitempty"`
	RegistrationAddress string `json:"registration_address,omitempty"`
	BankAccountNr       string `json:"bank_account_nr,omitempty"`
	Degree              string `json:"degree,omitempty"`
	Title               string `json:"title,omitempty"`
	FacultyId           int    `json:"faculty_id,omitempty"`
	AdminRole           string `json:"admin_role,omitempty"`
	EmailAppPassword    string `json:"email_app_password,omitempty"`
}

type RegisterResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

var users = []RegisterRequest{
	{
		Email:     "admin@system.com",
		Password:  "SystemAdmin123!",
		Name:      "System",
		Surname:   "Admin",
		Role:      "admin",
		PESEL:     "66060958695",
		PhoneNr:   "+48123456789",
		AdminRole: "System Administrator",
		FacultyId: 1,
	},
	{
		Email:               "michal.grzonkowski@student.edu.pl",
		Password:            "Michal123!",
		Name:                "Michał",
		Surname:             "Grzonkowski",
		Role:                "student",
		PESEL:               "78110366831",
		PhoneNr:             "+48345678901",
		PostalAddress:       "ul. Młodziezowa 3, Gdańsk",
		RegistrationAddress: "ul. Młodzieżowa 3, Gdańsk",
		BankAccountNr:       "34567890123456789012345678",
	},
	{
		Email:               "jan.kowalski@student.edu.pl",
		Password:            "Jan123!!!",
		Name:                "Jan",
		Surname:             "Kowalski",
		Role:                "student",
		PESEL:               "55030992456",
		PhoneNr:             "+48123456789",
		PostalAddress:       "ul. Studencka 1, Warszawa",
		RegistrationAddress: "ul. Studencka 1, Warszawa",
		BankAccountNr:       "12345678901234567890123456",
	},
	{
		Email:               "anna.nowak@student.edu.pl",
		Password:            "Anna123!",
		Name:                "Anna",
		Surname:             "Nowak",
		Role:                "student",
		PESEL:               "88022266587",
		PhoneNr:             "+48234567890",
		PostalAddress:       "ul. Akademicka 2, Kraków",
		RegistrationAddress: "ul. Akademicka 2, Kraków",
		BankAccountNr:       "23456789012345678901234567",
	},
	{
		Email:               "emil.kosicki@edu.pl",
		Password:            "Emil123!",
		Name:                "Emil",
		Surname:             "Kosicki",
		Role:                "teacher",
		PESEL:               "58071125265",
		PhoneNr:             "+48456789012",
		PostalAddress:       "ul. Profesorska 10, Warszawa",
		RegistrationAddress: "ul. Profesorska 10, Warszawa",
		BankAccountNr:       "45678901234567890123456789",
		Degree:              "Dr",
		Title:               "Adiunkt",
		FacultyId:           1,
	},
	{
		Email:               "weronika.mazurek@edu.pl",
		Password:            "Weronika123!",
		Name:                "Weronika",
		Surname:             "Mazurek",
		Role:                "teacher",
		PESEL:               "63102015417",
		PhoneNr:             "+48567890123",
		PostalAddress:       "ul. Naukowa 15, Kraków",
		RegistrationAddress: "ul. Naukowa 15, Kraków",
		BankAccountNr:       "56789012345678901234567890",
		Degree:              "Prof. dr hab.",
		Title:               "Profesor zwyczajny",
		FacultyId:           2,
	},
	{
		Email:               "kacper.pawlak@edu.pl",
		Password:            "Kacper123!",
		Name:                "Kacper",
		Surname:             "Pawlak",
		Role:                "teacher",
		PESEL:               "94041363837",
		PhoneNr:             "+48678901234",
		PostalAddress:       "ul. Uniwersytecka 20, Gdańsk",
		RegistrationAddress: "ul. Uniwersytecka 20, Gdańsk",
		BankAccountNr:       "67890123456789012345678901",
		Degree:              "Dr hab.",
		Title:               "Profesor nadzwyczajny",
		FacultyId:           3,
	},
	{
		Email:               "agnieszka.kowalik@edu.pl",
		Password:            "Agnieszka123!",
		Name:                "Agnieszka",
		Surname:             "Kowalik",
		Role:                "admin",
		PESEL:               "95041726468",
		PhoneNr:             "+48789012345",
		PostalAddress:       "ul. Biurowa 5, Warszawa",
		RegistrationAddress: "ul. Biurowa 5, Warszawa",
		BankAccountNr:       "78901234567890123456789012",
		FacultyId:           1,
		AdminRole:           "Kierownik Dziekanatu",
	},
	{
		Email:               "karol.kudlacz@student.ukw.edu.pl",
		Password:            "Karol123!",
		Name:                "Karol",
		Surname:             "Kudłacz",
		Role:                "admin",
		PESEL:               "89061376473",
		PhoneNr:             "+48890123456",
		PostalAddress:       "ul. Administracyjna 7, Kraków",
		RegistrationAddress: "ul. Administracyjna 7, Kraków",
		BankAccountNr:       "89012345678901234567890123",
		FacultyId:           1,
		AdminRole:           "Administrator Systemu",
		EmailAppPassword:    "TUTAJ_PODAJESZ_SWOJE_HASŁO_DO_POCZTY!",
	},
}

func main() {
	log.Println("Czekam 5 sekund na uruchomienie serwisów...")
	time.Sleep(5 * time.Second)

	log.Println("Rozpoczynam rejestrację użytkowników...")

	for _, user := range users {
		registerUser(user)
		time.Sleep(1 * time.Second)
	}

	log.Println("admin@system.com / SystemAdmin123!")
	log.Println("michal.grzonkowski@student.edu.pl / Michal123!")
	log.Println("jan.kowalski@student.edu.pl / Jan123!")
	log.Println("anna.nowak@student.edu.pl / Anna123!")
	log.Println("emil.kosicki@edu.pl / Emil123!")
	log.Println("weronika.mazurek@edu.pl / Weronika123!")
	log.Println("kacper.pawlak@edu.pl / Kacper123!")
	log.Println("agnieszka.kowalik@edu.pl / Agnieszka123!")
	log.Println("karol.kudlacz@student.ukw.edu.pl / Karol123!")
}

func registerUser(user RegisterRequest) {
	jsonData, _ := json.Marshal(user)

	resp, err := http.Post("http://api-gateway:8083/api/auth/register", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("Błąd dla %s: %v", user.Email, err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var response RegisterResponse
	json.Unmarshal(body, &response)

	if response.Success {
		log.Printf("%s (%s)", user.Email, user.Role)
	} else if response.Message == "User with this email already exists" {
		log.Printf(" %s już istnieje", user.Email)
	} else {
		log.Printf(" %s: %s", user.Email, response.Message)
	}
}
