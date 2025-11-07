package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/brianvoe/gofakeit/v7"
	_ "github.com/lib/pq"
)

var (
	polishFirstNames = []string{
		"Jan", "Anna", "Piotr", "Maria", "Krzysztof", "Katarzyna", "Andrzej", "Magdalena",
		"Tomasz", "Agnieszka", "Paweł", "Barbara", "Michał", "Ewa", "Marcin", "Joanna",
		"Kamil", "Monika", "Jakub", "Natalia", "Mateusz", "Aleksandra", "Adam", "Karolina",
		"Łukasz", "Justyna", "Wojciech", "Martyna", "Bartosz", "Paulina", "Maciej", "Weronika",
		"Grzegorz", "Sylwia", "Rafał", "Izabela", "Szymon", "Beata", "Damian", "Patrycja",
		"Adrian", "Dorota", "Dawid", "Zofia", "Sebastian", "Julia", "Kacper", "Iwona",
	}

	polishLastNames = []string{
		"Nowak", "Kowalski", "Wiśniewski", "Wójcik", "Kowalczyk", "Kamiński", "Lewandowski",
		"Zieliński", "Szymański", "Woźniak", "Dąbrowski", "Kozłowski", "Jankowski", "Mazur",
		"Kwiatkowski", "Krawczyk", "Piotrowski", "Grabowski", "Nowakowski", "Pawłowski",
		"Michalski", "Adamczyk", "Dudek", "Stępień", "Jaworski", "Pawlak", "Górski",
		"Witkowski", "Rutkowski", "Sikora", "Bąk", "Ostrowski", "Baran", "Szewczyk",
		"Tomaszewski", "Pietrzak", "Marciniak", "Wróbel", "Zalewski", "Król",
	}

	bydgoszczStreets = []string{
		"ul. Gdańska", "ul. Toruńska", "ul. Fordońska", "ul. Jagiellońska",
		"ul. Dworcowa", "ul. Chodkiewicza", "ul. Kopernika", "ul. Długa",
		"ul. Jagiellońska", "ul. Nakielska", "ul. Śniadeckich", "ul. Sułkowskiego",
	}
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	APIURL     string
}

func loadConfig() Config {
	return Config{
		DBHost:     getEnv("DB_HOST", "postgres"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "mysecretpassword"),
		DBName:     getEnv("DB_NAME", "mydb"),
		APIURL:     getEnv("API_URL", "http://api-gateway:8083"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func connectDB(cfg Config) (*sql.DB, error) {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

func randomPolishName() string {
	return polishFirstNames[rand.Intn(len(polishFirstNames))]
}

func randomPolishSurname() string {
	return polishLastNames[rand.Intn(len(polishLastNames))]
}

func randomBydgoszczAddress() string {
	street := bydgoszczStreets[rand.Intn(len(bydgoszczStreets))]
	number := rand.Intn(150) + 1
	return fmt.Sprintf("%s %d, Bydgoszcz", street, number)
}

func randomPESEL() string {
	return fmt.Sprintf("%02d%02d%02d%05d",
		rand.Intn(100), rand.Intn(13), rand.Intn(32),
		rand.Intn(100000))
}

func randomPhoneNumber() string {
	return fmt.Sprintf("+48%d%08d", rand.Intn(9)+1, rand.Intn(100000000))
}

func randomBankAccount() string {
	return fmt.Sprintf("PL%026d", rand.Intn(1000000000000000000))
}

func main() {
	rand.Seed(time.Now().UnixNano())
	gofakeit.Seed(time.Now().UnixNano())

	cfg := loadConfig()
	db, err := connectDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("✅ Connected to database")

	if err := generateSubjects(db); err != nil {
		log.Fatalf("Failed to generate subjects: %v", err)
	}

	if err := generateCourses(db); err != nil {
		log.Fatalf("Failed to generate courses: %v", err)
	}

	if err := generateModules(db); err != nil {
		log.Fatalf("Failed to generate modules: %v", err)
	}

	if err := generateClasses(db); err != nil {
		log.Fatalf("Failed to generate classes: %v", err)
	}

	if err := linkCourseSubjects(db); err != nil {
		log.Fatalf("Failed to link course subjects: %v", err)
	}

	if err := linkModuleSubjects(db); err != nil {
		log.Fatalf("Failed to link module subjects: %v", err)
	}

	if err := generateAdditionalUsers(db, cfg); err != nil {
		log.Fatalf("Failed to generate additional users: %v", err)
	}

	if err := generateProductionRelations(db); err != nil {
		log.Fatalf("Failed to generate production relations: %v", err)
	}

	printSummary(db)
}

func generateSubjects(db *sql.DB) error {

	subjects := []struct {
		alias       string
		name        string
		ects        float64
		description string
		syllabus    string
	}{
		// Przedmioty ogólne (15)
		{"MAT1", "Matematyka I", 6, "Analiza matematyczna", "Granice, pochodne, całki"},
		{"MAT2", "Matematyka II", 6, "Algebra liniowa", "Macierze, układy równań, przestrzenie wektorowe"},
		{"FIZ1", "Fizyka I", 5, "Mechanika klasyczna", "Kinematyka, dynamika"},
		{"FIZ2", "Fizyka II", 5, "Elektromagnetyzm", "Pole elektryczne i magnetyczne"},
		{"ANG1", "Język angielski I", 2, "Angielski akademicki", "Czytanie tekstów naukowych"},
		{"ANG2", "Język angielski II", 2, "Konwersacje techniczne", "Prezentacje i dyskusje"},
		{"WF1", "Wychowanie fizyczne", 0, "Aktywność fizyczna", "Zajęcia sportowe"},
		{"FIL1", "Filozofia", 2, "Wprowadzenie do filozofii", "Historia myśli filozoficznej"},
		{"STAT", "Statystyka", 4, "Statystyka opisowa i indukcyjna", "Testy, rozkłady prawdopodobieństwa"},
		{"LOG", "Logika", 3, "Logika matematyczna", "Rachunek zdań, kwantyfikatory"},
		{"EKON", "Ekonomia", 3, "Podstawy ekonomii", "Mikro i makroekonomia"},
		{"PRAWN", "Prawo", 2, "Prawo dla inżynierów", "Prawo gospodarcze i autorskie"},
		{"PSYCH", "Psychologia", 2, "Psychologia pracy", "Zarządzanie zespołem"},
		{"EKOL", "Ekologia", 2, "Ochrona środowiska", "Zrównoważony rozwój"},
		{"PROJ", "Zarządzanie projektami", 3, "Metodyki projektowe", "Agile, Scrum, Waterfall"},

		// Informatyka (25)
		{"PROG1", "Programowanie I", 6, "Podstawy C", "Zmienne, funkcje, wskaźniki"},
		{"PROG2", "Programowanie II", 6, "Programowanie obiektowe", "Klasy, dziedziczenie, polimorfizm"},
		{"PROG3", "Programowanie III", 5, "Struktury danych", "Listy, drzewa, grafy"},
		{"ALG", "Algorytmy", 6, "Algorytmy i złożoność", "Sortowanie, przeszukiwanie"},
		{"BD", "Bazy danych", 5, "SQL i projektowanie BD", "Normalizacja, transakcje"},
		{"SYST", "Systemy operacyjne", 5, "Unix/Linux", "Procesy, pamięć, systemy plików"},
		{"SIECI", "Sieci komputerowe", 5, "Protokoły TCP/IP", "Routing, switching"},
		{"WEB", "Aplikacje webowe", 5, "Frontend i backend", "HTML, CSS, JS, REST API"},
		{"MOBILE", "Aplikacje mobilne", 4, "Android/iOS", "UI, architektura aplikacji"},
		{"AI", "Sztuczna inteligencja", 5, "ML i deep learning", "Sieci neuronowe, klasyfikacja"},
		{"BIG", "Big Data", 4, "Przetwarzanie dużych zbiorów", "Hadoop, Spark"},
		{"CYBER", "Cyberbezpieczeństwo", 4, "Bezpieczeństwo systemów", "Kryptografia, ataki, obrona"},
		{"CLOUD", "Cloud Computing", 4, "AWS, Azure, GCP", "Wdrażanie w chmurze"},
		{"DEVOPS", "DevOps", 3, "CI/CD", "Docker, Kubernetes, Jenkins"},
		{"GAME", "Game Development", 4, "Tworzenie gier", "Unity, Unreal Engine"},
		{"IOT", "Internet of Things", 4, "Urządzenia IoT", "Sensory, komunikacja"},
		{"BLOCK", "Blockchain", 3, "Technologia blockchain", "Bitcoin, Ethereum, smart contracts"},
		{"COMP", "Grafika komputerowa", 4, "Renderowanie 3D", "OpenGL, ray tracing"},
		{"NLP", "Przetwarzanie języka", 4, "NLP", "Analiza tekstu, chatboty"},
		{"ROBO", "Robotyka", 5, "Projektowanie robotów", "Kinematyka, sterowanie"},
		{"VR", "Virtual Reality", 4, "Rzeczywistość wirtualna", "VR headsets, interakcja"},
		{"UI", "User Interface Design", 3, "Projektowanie UI/UX", "Prototypowanie, testy użyteczności"},
		{"SOFT", "Software Engineering", 5, "Inżynieria oprogramowania", "Wzorce projektowe, testowanie"},
		{"COMP-ARCH", "Architektura komputerów", 5, "Budowa komputera", "CPU, pamięć, magistrale"},
		{"COMPILER", "Kompilatory", 5, "Teoria kompilatorów", "Parsowanie, optymalizacja kodu"},

		// Fizyka (10)
		{"FIZ-TERMO", "Termodynamika", 5, "Zasady termodynamiki", "Entropia, silniki cieplne"},
		{"FIZ-KWANT", "Mechanika kwantowa", 6, "Fizyka kwantowa", "Funkcja falowa, operatory"},
		{"FIZ-ATOM", "Fizyka atomowa", 5, "Struktura atomu", "Model Bohra, widma"},
		{"FIZ-JAD", "Fizyka jądrowa", 5, "Jądro atomowe", "Rozpad, synteza"},
		{"FIZ-CZAST", "Fizyka cząstek", 6, "Cząstki elementarne", "Model standardowy"},
		{"FIZ-OPT", "Optyka", 4, "Optyka geometryczna i falowa", "Soczewki, interferencja"},
		{"FIZ-AKUST", "Akustyka", 3, "Fale dźwiękowe", "Rezonans, ultradźwięki"},
		{"FIZ-MAT", "Fizyka materiałów", 4, "Właściwości materiałów", "Kryształy, półprzewodniki"},
		{"FIZ-ASTRO", "Astrofizyka", 4, "Fizyka ciał niebieskich", "Gwiazdy, galaktyki"},
		{"FIZ-LAB", "Laboratorium fizyczne", 3, "Doświadczenia", "Pomiary, analiza błędów"},

		// Mechatronika (10)
		{"MECH-TECH", "Technologie 3D", 4, "Druk 3D", "CAD, prototypowanie"},
		{"MECH-AUTO", "Automatyka", 5, "Sterowanie automatyczne", "Regulatory PID"},
		{"MECH-ELEKTRO", "Elektronika", 5, "Układy elektroniczne", "Tranzystory, wzmacniacze"},
		{"MECH-MECHAN", "Mechanika techniczna", 6, "Statyka i dynamika", "Wytrzymałość materiałów"},
		{"MECH-HYDRA", "Hydraulika", 4, "Układy hydrauliczne", "Pompy, zawory"},
		{"MECH-PNEUMA", "Pneumatyka", 4, "Układy pneumatyczne", "Sprężarki, siłowniki"},
		{"MECH-SENS", "Sensoryka", 4, "Czujniki i przetworniki", "Pomiar temperatury, ciśnienia"},
		{"MECH-EMB", "Systemy wbudowane", 5, "Mikrokontrolery", "Arduino, STM32"},
		{"MECH-ROBOT", "Robotyka przemysłowa", 5, "Roboty przemysłowe", "Programowanie robotów"},
		{"MECH-CNC", "Obrabiarki CNC", 4, "Sterowanie numeryczne", "Programowanie G-code"},
	}

	for _, s := range subjects {
		_, err := db.Exec(`
			INSERT INTO subjects (alias, name, ECTS, description, syllabus)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (alias) DO NOTHING
		`, s.alias, s.name, s.ects, s.description, s.syllabus)

		if err != nil {
			return fmt.Errorf("failed to insert subject %s: %w", s.alias, err)
		}
	}

	return nil
}

func generateCourses(db *sql.DB) error {

	courses := []struct {
		alias      string
		name       string
		year       int
		semester   int
		mode       string
		degreeType string
		degree     string
		facultyID  int
	}{
		// Informatyka - 6 kierunków
		{"INF-S-I-1", "Informatyka", 1, 1, "stacjonarne", "inzynierskie", "1", 1},
		{"INF-S-I-2", "Informatyka", 1, 2, "stacjonarne", "inzynierskie", "1", 1},
		{"INF-NS-I-1", "Informatyka", 1, 1, "niestacjonarne", "inzynierskie", "1", 1},
		{"INF-NS-M-1", "Informatyka", 1, 1, "niestacjonarne", "magisterskie", "2", 1},
		{"INF-S-M-1", "Informatyka", 1, 1, "stacjonarne", "magisterskie", "2", 1},
		{"INF-S-L-1", "Informatyka stosowana", 1, 1, "stacjonarne", "licencjackie", "1", 1},

		// Matematyka - 4 kierunki
		{"MAT-S-L-1", "Matematyka", 1, 1, "stacjonarne", "licencjackie", "1", 2},
		{"MAT-S-M-1", "Matematyka", 1, 1, "stacjonarne", "magisterskie", "2", 2},
		{"MAT-NS-L-1", "Matematyka stosowana", 1, 1, "niestacjonarne", "licencjackie", "1", 2},
		{"MAT-S-I-1", "Matematyka", 1, 1, "stacjonarne", "inzynierskie", "1", 2},

		// Fizyka - 4 kierunki
		{"FIZ-S-I-1", "Fizyka", 1, 1, "stacjonarne", "inzynierskie", "1", 3},
		{"FIZ-S-M-1", "Fizyka", 1, 1, "stacjonarne", "magisterskie", "2", 3},
		{"FIZ-NS-I-1", "Fizyka techniczna", 1, 1, "niestacjonarne", "inzynierskie", "1", 3},
		{"FIZ-S-L-1", "Fizyka medyczna", 1, 1, "stacjonarne", "licencjackie", "1", 3},

		// Mechatronika - 4 kierunki
		{"MECH-S-I-1", "Mechatronika", 1, 1, "stacjonarne", "inzynierskie", "1", 4},
		{"MECH-NS-I-1", "Mechatronika", 1, 1, "niestacjonarne", "inzynierskie", "1", 4},
		{"MECH-S-M-1", "Mechatronika", 1, 1, "stacjonarne", "magisterskie", "2", 4},
		{"MECH-S-I-2", "Automatyka i Robotyka", 1, 1, "stacjonarne", "inzynierskie", "1", 4},
	}

	for _, c := range courses {
		_, err := db.Exec(`
			INSERT INTO courses (alias, name, year, semester, course_mode, degree_type, degree, faculty_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT DO NOTHING
		`, c.alias, c.name, c.year, c.semester, c.mode, c.degreeType, c.degree, c.facultyID)

		if err != nil {
			return fmt.Errorf("failed to insert course %s: %w", c.alias, err)
		}
	}

	return nil
}

func generateModules(db *sql.DB) error {

	rows, err := db.Query("SELECT course_id, alias FROM courses")
	if err != nil {
		return err
	}
	defer rows.Close()

	var courseIDs []int
	for rows.Next() {
		var id int
		var alias string
		if err := rows.Scan(&id, &alias); err != nil {
			return err
		}
		courseIDs = append(courseIDs, id)
	}

	moduleNames := []string{
		"Programowanie aplikacji", "Bazy danych i BigData", "Sieci i bezpieczeństwo",
		"AI i Machine Learning", "Rozwój mobilny", "Cloud Computing",
		"Analiza matematyczna", "Algebra i geometria", "Statystyka stosowana",
		"Fizyka doświadczalna", "Mechanika kwantowa", "Elektronika i automatyka",
		"Robotyka i IoT", "Systemy wbudowane", "Projektowanie CAD",
	}

	count := 0
	for _, courseID := range courseIDs {
		// 3-5 modułów na kierunek
		numModules := rand.Intn(3) + 3
		for i := 0; i < numModules; i++ {
			moduleName := moduleNames[rand.Intn(len(moduleNames))]
			alias := fmt.Sprintf("MOD-%d-%d", courseID, i+1)

			_, err := db.Exec(`
				INSERT INTO modules (alias, name, course_id)
				VALUES ($1, $2, $3)
				ON CONFLICT DO NOTHING
			`, alias, moduleName, courseID)

			if err != nil {
				return fmt.Errorf("failed to insert module: %w", err)
			}
			count++
		}
	}

	return nil
}

func generateClasses(db *sql.DB) error {

	rows, err := db.Query("SELECT subject_id, alias FROM subjects")
	if err != nil {
		return err
	}
	defer rows.Close()

	type subject struct {
		id    int
		alias string
	}

	var subjects []subject
	for rows.Next() {
		var s subject
		if err := rows.Scan(&s.id, &s.alias); err != nil {
			return err
		}
		subjects = append(subjects, s)
	}

	classTypes := []string{"wykład", "laboratorium", "ćwiczenia", "projekt", "seminarium"}
	credits := []string{"egzamin", "zaliczenie na ocenę", "zaliczenie", "kolokwium", "projekt"}
	buildings := []int{1, 2, 3, 4, 5, 6, 7, 8}

	count := 0
	for _, subj := range subjects {
		// Każdy przedmiot ma 2-4 grupy zajęciowe
		numClasses := rand.Intn(3) + 2
		for i := 0; i < numClasses; i++ {
			classType := classTypes[rand.Intn(len(classTypes))]
			credit := credits[rand.Intn(len(credits))]
			spanHours := rand.Intn(30) + 15
			groupNr := i + 1
			
			var capacity, currentCapacity int
			if classType == "wykład" {
				capacity = rand.Intn(50) + 50
			} else if classType == "laboratorium" {
				capacity = rand.Intn(8) + 12
			} else {
				capacity = rand.Intn(15) + 20
			}
			currentCapacity = rand.Intn(capacity-5) + 5

			classroom := rand.Intn(400) + 100
			buildingID := buildings[rand.Intn(len(buildings))]

			_, err := db.Exec(`
				INSERT INTO classes (class_type, credit, span_of_hours, group_nr, current_capacity, 
									capacity, classroom, building_id, subject_id)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			`, classType, credit, spanHours, groupNr, currentCapacity, capacity, classroom, buildingID, subj.id)

			if err != nil {
				return fmt.Errorf("failed to insert class: %w", err)
			}
			count++
		}
	}

	return nil
}

func linkCourseSubjects(db *sql.DB) error {

	rows, err := db.Query("SELECT course_id, alias FROM courses")
	if err != nil {
		return err
	}
	defer rows.Close()

	type course struct {
		id    int
		alias string
	}

	var courses []course
	for rows.Next() {
		var c course
		if err := rows.Scan(&c.id, &c.alias); err != nil {
			return err
		}
		courses = append(courses, c)
	}

	subjectRows, err := db.Query("SELECT subject_id FROM subjects")
	if err != nil {
		return err
	}
	defer subjectRows.Close()

	var subjectIDs []int
	for subjectRows.Next() {
		var id int
		if err := subjectRows.Scan(&id); err != nil {
			return err
		}
		subjectIDs = append(subjectIDs, id)
	}

	count := 0
	for _, course := range courses {
		numSubjects := rand.Intn(6) + 5
		
		shuffled := make([]int, len(subjectIDs))
		copy(shuffled, subjectIDs)
		rand.Shuffle(len(shuffled), func(i, j int) {
			shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
		})

		for i := 0; i < numSubjects && i < len(shuffled); i++ {
			_, err := db.Exec(`
				INSERT INTO course_subjects (course_id, subject_id)
				VALUES ($1, $2)
				ON CONFLICT DO NOTHING
			`, course.id, shuffled[i])

			if err != nil {
				return fmt.Errorf("failed to link course-subject: %w", err)
			}
			count++
		}
	}

	return nil
}

func linkModuleSubjects(db *sql.DB) error {

	rows, err := db.Query("SELECT module_id FROM modules")
	if err != nil {
		return err
	}
	defer rows.Close()

	var moduleIDs []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return err
		}
		moduleIDs = append(moduleIDs, id)
	}

	subjectRows, err := db.Query("SELECT subject_id FROM subjects")
	if err != nil {
		return err
	}
	defer subjectRows.Close()

	var subjectIDs []int
	for subjectRows.Next() {
		var id int
		if err := subjectRows.Scan(&id); err != nil {
			return err
		}
		subjectIDs = append(subjectIDs, id)
	}

	count := 0
	for _, moduleID := range moduleIDs {
		numSubjects := rand.Intn(3) + 2
		
		shuffled := make([]int, len(subjectIDs))
		copy(shuffled, subjectIDs)
		rand.Shuffle(len(shuffled), func(i, j int) {
			shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
		})

		for i := 0; i < numSubjects && i < len(shuffled); i++ {
			_, err := db.Exec(`
				INSERT INTO module_subjects (module_id, subject_id)
				VALUES ($1, $2)
				ON CONFLICT DO NOTHING
			`, moduleID, shuffled[i])

			if err != nil {
				return fmt.Errorf("failed to link module-subject: %w", err)
			}
			count++
		}
	}

	return nil
}

func generateAdditionalUsers(db *sql.DB, cfg Config) error {

	var existingCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&existingCount); err != nil {
		return err
	}

	log.Printf("Found %d existing users from init_users", existingCount)

	for i := 0; i < 61; i++ {
		firstName := randomPolishName()
		lastName := randomPolishSurname()
		email := fmt.Sprintf("%s.%s%d@student.edu.pl", 
			strings.ToLower(firstName), 
			strings.ToLower(lastName), 
			i+1)
		
		password := fmt.Sprintf("%s123!", firstName)

		user := map[string]interface{}{
			"email":                email,
			"password":             password,
			"name":                 firstName,
			"surname":              lastName,
			"role":                 "student",
			"pesel":                randomPESEL(),
			"phone_nr":             randomPhoneNumber(),
			"postal_address":       randomBydgoszczAddress(),
			"registration_address": randomBydgoszczAddress(),
			"bank_account_nr":      randomBankAccount(),
		}

		if err := registerUserViaAPI(cfg.APIURL, user); err != nil {
			log.Printf("  Warning: Failed to create student %s: %v", email, err)
		} else {
			log.Printf(" Created student: %s", email)
		}

		time.Sleep(100 * time.Millisecond) // Rate limiting
	}

	degrees := []string{"Dr", "Dr hab.", "Prof. dr hab."}
	titles := []string{"Adiunkt", "Profesor nadzwyczajny", "Profesor zwyczajny", "Wykładowca"}
	
	for i := 0; i < 20; i++ {
		firstName := randomPolishName()
		lastName := randomPolishSurname()
		email := fmt.Sprintf("%s.%s%d@edu.pl", 
			strings.ToLower(firstName), 
			strings.ToLower(lastName), 
			i+1)
		
		password := fmt.Sprintf("%s123!", firstName)
		facultyID := rand.Intn(4) + 1 // 1-4

		user := map[string]interface{}{
			"email":                email,
			"password":             password,
			"name":                 firstName,
			"surname":              lastName,
			"role":                 "teacher",
			"pesel":                randomPESEL(),
			"phone_nr":             randomPhoneNumber(),
			"postal_address":       randomBydgoszczAddress(),
			"registration_address": randomBydgoszczAddress(),
			"bank_account_nr":      randomBankAccount(),
			"degree":               degrees[rand.Intn(len(degrees))],
			"title":                titles[rand.Intn(len(titles))],
			"faculty_id":           facultyID,
		}

		if err := registerUserViaAPI(cfg.APIURL, user); err != nil {
			log.Printf("  Warning: Failed to create teacher %s: %v", email, err)
		} else {
			log.Printf(" Created teacher: %s", email)
		}

		time.Sleep(100 * time.Millisecond)
	}

	adminRoles := []string{"Dziekan", "Prodziekan", "Kierownik Dziekanatu", "Sekretarz", "Administrator IT"}
	
	for i := 0; i < 10; i++ {
		firstName := randomPolishName()
		lastName := randomPolishSurname()
		email := fmt.Sprintf("%s.%s%d@admin.edu.pl", 
			strings.ToLower(firstName), 
			strings.ToLower(lastName), 
			i+1)
		
		password := fmt.Sprintf("%s123!", firstName)
		facultyID := rand.Intn(4) + 1

		user := map[string]interface{}{
			"email":                email,
			"password":             password,
			"name":                 firstName,
			"surname":              lastName,
			"role":                 "admin",
			"pesel":                randomPESEL(),
			"phone_nr":             randomPhoneNumber(),
			"postal_address":       randomBydgoszczAddress(),
			"registration_address": randomBydgoszczAddress(),
			"bank_account_nr":      randomBankAccount(),
			"faculty_id":           facultyID,
			"admin_role":           adminRoles[rand.Intn(len(adminRoles))],
		}

		if err := registerUserViaAPI(cfg.APIURL, user); err != nil {
			log.Printf("  Warning: Failed to create admin %s: %v", email, err)
		} else {
			log.Printf(" Created admin: %s", email)
		}

		time.Sleep(100 * time.Millisecond)
	}

	var finalCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&finalCount); err != nil {
		return err
	}

	log.Printf(" Total users in database: %d", finalCount)
	return nil
}

func registerUserViaAPI(apiURL string, user map[string]interface{}) error {
	jsonData, err := json.Marshal(user)
	if err != nil {
		return err
	}

	resp, err := http.Post(apiURL+"/api/auth/register", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	
	var response map[string]interface{}
	if err := json.Unmarshal(body, &response); err != nil {
		return err
	}

	if success, ok := response["success"].(bool); !ok || !success {
		if msg, ok := response["message"].(string); ok {
			if strings.Contains(msg, "already exists") {
				return nil // Not an error, just skip
			}
			return fmt.Errorf(msg)
		}
		return fmt.Errorf("registration failed")
	}

	return nil
}

func printSummary(db *sql.DB) {
	tables := []string{"faculties", "buildings", "subjects", "courses", "modules", "classes", 
		"course_subjects", "module_subjects", "users", "students", "teaching_staff", "administrative_staff",
		"course_instructors", "student_classes", "grades", "messages", "applications", "surveys"}
	
	for _, table := range tables {
		var count int
		query := fmt.Sprintf("SELECT COUNT(*) FROM %s", table)
		if err := db.QueryRow(query).Scan(&count); err == nil {
			log.Printf("  %s: %d", table, count)
		}
	}
}

func generateProductionRelations(db *sql.DB) error {

	var classIDs []int
	rows, err := db.Query("SELECT class_id FROM classes")
	if err != nil {
		return err
	}
	for rows.Next() {
		var id int
		rows.Scan(&id)
		classIDs = append(classIDs, id)
	}
	rows.Close()

	var teacherIDs []int
	rows, err = db.Query("SELECT teaching_staff_id FROM teaching_staff")
	if err != nil {
		return err
	}
	for rows.Next() {
		var id int
		rows.Scan(&id)
		teacherIDs = append(teacherIDs, id)
	}
	rows.Close()

	var studentAlbums []int
	rows, err = db.Query("SELECT album_nr FROM students")
	if err != nil {
		return err
	}
	for rows.Next() {
		var id int
		rows.Scan(&id)
		studentAlbums = append(studentAlbums, id)
	}
	rows.Close()

	countInstructors := 0
	for _, classID := range classIDs {
		numTeachers := rand.Intn(2) + 1
		shuffled := make([]int, len(teacherIDs))
		copy(shuffled, teacherIDs)
		rand.Shuffle(len(shuffled), func(i, j int) {
			shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
		})

		for i := 0; i < numTeachers && i < len(shuffled); i++ {
			_, err := db.Exec(`
				INSERT INTO course_instructors (class_id, teaching_staff_id)
				VALUES ($1, $2)
				ON CONFLICT DO NOTHING
			`, classID, shuffled[i])
			if err == nil {
				countInstructors++
			}
		}
	}

	countEnrollments := 0
	for _, albumNr := range studentAlbums {
		// Each student enrolls in 5-8 classes
		numClasses := rand.Intn(4) + 5
		shuffled := make([]int, len(classIDs))
		copy(shuffled, classIDs)
		rand.Shuffle(len(shuffled), func(i, j int) {
			shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
		})

		for i := 0; i < numClasses && i < len(shuffled); i++ {
			_, err := db.Exec(`
				INSERT INTO student_classes (class_id, album_nr)
				VALUES ($1, $2)
				ON CONFLICT DO NOTHING
			`, shuffled[i], albumNr)
			if err == nil {
				countEnrollments++
			}
		}
	}

	countGrades := 0
	
	gradeValues := []string{"2.0", "3.0", "3.5", "4.0", "4.5", "5.0", "ZAL", "NZAL"}
	gradeWeights := []float64{0.05, 0.15, 0.20, 0.25, 0.25, 0.10} 
	
	comments := []string{
		"Dobra praca", "Bardzo dobrze", "Zadowalająco", "Wymaga poprawy",
		"Świetne wykonanie", "Poprawnie", "Zaliczone", "Niezaliczone",
		"Bardzo dobra znajomość tematu", "Podstawowa znajomość", "",
	}

	enrollmentRows, err := db.Query(`
		SELECT sc.album_nr, sc.class_id, c.subject_id
		FROM student_classes sc
		JOIN classes c ON sc.class_id = c.class_id
	`)
	if err != nil {
		return err
	}
	defer enrollmentRows.Close()

	type enrollment struct {
		albumNr   int
		classID   int
		subjectID int
	}
	var enrollments []enrollment
	for enrollmentRows.Next() {
		var e enrollment
		enrollmentRows.Scan(&e.albumNr, &e.classID, &e.subjectID)
		enrollments = append(enrollments, e)
	}

	for _, enr := range enrollments {
		if rand.Float64() > 0.7 {
			continue
		}

		var teacherID int
		err := db.QueryRow(`
			SELECT teaching_staff_id 
			FROM course_instructors 
			WHERE class_id = $1 
			ORDER BY RANDOM() 
			LIMIT 1
		`, enr.classID).Scan(&teacherID)
		if err != nil {
			continue 
		}

		r := rand.Float64()
		var gradeValue string
		cumulative := 0.0
		for i, weight := range gradeWeights {
			cumulative += weight
			if r <= cumulative {
				gradeValue = gradeValues[i]
				break
			}
		}
		if gradeValue == "" {
			gradeValue = "4.0" 
		}

		comment := comments[rand.Intn(len(comments))]
		weight := 1
		attempt := 1

		daysAgo := rand.Intn(90)
		gradeDate := time.Now().AddDate(0, 0, -daysAgo)

		_, err = db.Exec(`
			INSERT INTO grades (album_nr, class_id, subject_id, value, weight, attempt, 
								added_by_teaching_staff_id, comment, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (album_nr, class_id, attempt) DO NOTHING
		`, enr.albumNr, enr.classID, enr.subjectID, gradeValue, weight, attempt, 
		   teacherID, comment, gradeDate)

		if err == nil {
			countGrades++
		}
	}
	countMessages := 0
	
	messageTitles := []string{
		"Rozpoczęcie semestru", "Harmonogram egzaminów", "Zmiana terminu zajęć",
		"Konsultacje", "Materiały do zajęć", "Projekt zaliczeniowy",
		"Laboratorium - przypomnienie", "Kolokwium", "Egzamin poprawkowy",
		"Ankieta oceny zajęć", "Dzień otwarty", "Konferencja naukowa",
	}

	messageContent := "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Informuję o ważnych zmianach."

	var userIDs []int
	userRows, err := db.Query("SELECT user_id FROM users")
	if err != nil {
		return err
	}
	for userRows.Next() {
		var id int
		userRows.Scan(&id)
		userIDs = append(userIDs, id)
	}
	userRows.Close()

	var teacherUserIDs []int
	teacherUserRows, err := db.Query(`
		SELECT u.user_id 
		FROM users u 
		JOIN teaching_staff ts ON u.user_id = ts.user_id
	`)
	if err != nil {
		return err
	}
	for teacherUserRows.Next() {
		var id int
		teacherUserRows.Scan(&id)
		teacherUserIDs = append(teacherUserIDs, id)
	}
	teacherUserRows.Close()

	numMessages := rand.Intn(31) + 50
	for i := 0; i < numMessages; i++ {
		if len(teacherUserIDs) == 0 {
			break
		}

		senderID := teacherUserIDs[rand.Intn(len(teacherUserIDs))]
		title := messageTitles[rand.Intn(len(messageTitles))]
		
		daysAgo := rand.Intn(60)
		sendDate := time.Now().AddDate(0, 0, -daysAgo)

		var messageID int
		err := db.QueryRow(`
			INSERT INTO messages (sender_id, title, content, send_date)
			VALUES ($1, $2, $3, $4)
			RETURNING message_id
		`, senderID, title, messageContent, sendDate).Scan(&messageID)

		if err != nil {
			continue
		}
		countMessages++

		numRecipients := rand.Intn(11) + 5
		shuffledUsers := make([]int, len(userIDs))
		copy(shuffledUsers, userIDs)
		rand.Shuffle(len(shuffledUsers), func(i, j int) {
			shuffledUsers[i], shuffledUsers[j] = shuffledUsers[j], shuffledUsers[i]
		})

		for j := 0; j < numRecipients && j < len(shuffledUsers); j++ {
			var readAt *time.Time
			if rand.Float64() < 0.6 {
				readTime := sendDate.Add(time.Duration(rand.Intn(48)) * time.Hour)
				readAt = &readTime
			}

			if readAt != nil {
				db.Exec(`
					INSERT INTO message_recipients (message_id, recipient_id, read_at)
					VALUES ($1, $2, $3)
					ON CONFLICT DO NOTHING
				`, messageID, shuffledUsers[j], readAt)
			} else {
				db.Exec(`
					INSERT INTO message_recipients (message_id, recipient_id, read_at)
					VALUES ($1, $2, NULL)
					ON CONFLICT DO NOTHING
				`, messageID, shuffledUsers[j])
			}
		}
	}

	countApplications := 0

	var categoryIDs []int
	catRows, err := db.Query("SELECT category_id FROM application_categories")
	if err != nil {
		return err
	}
	for catRows.Next() {
		var id int
		catRows.Scan(&id)
		categoryIDs = append(categoryIDs, id)
	}
	catRows.Close()

	applicationTitles := map[int]string{
		1: "Wniosek o stypendium socjalne",
		2: "Wniosek o urlop dziekański",
		3: "Wniosek o zapomogę",
		4: "Wniosek o stypendium naukowe",
		5: "Wniosek o wymianę zagraniczną",
	}

	statuses := []string{"submitted", "submitted", "submitted", "approved", "rejected"}

	for _, albumNr := range studentAlbums {
		numApps := rand.Intn(3) 
		
		for i := 0; i < numApps && len(categoryIDs) > 0; i++ {
			catID := categoryIDs[rand.Intn(len(categoryIDs))]
			title := applicationTitles[catID]
			if title == "" {
				title = "Wniosek"
			}
			status := statuses[rand.Intn(len(statuses))]
			content := "Proszę o rozpatrzenie mojego wniosku."

			_, err := db.Exec(`
				INSERT INTO applications (category_id, album_nr, title, content, status)
				VALUES ($1, $2, $3, $4, $5)
			`, catID, albumNr, title, content, status)

			if err == nil {
				countApplications++
			}
		}
	}

	countSurveys := 0

	surveyQuestions := []string{
		"Jak oceniasz przydatność wykładu?",
		"Czy tempo prowadzenia zajęć było odpowiednie?",
		"Jak oceniasz jakość materiałów?",
		"Czy wykład był zrozumiały?",
		"Jak oceniasz trudność ćwiczeń?",
		"Czy zajęcia były dobrze zorganizowane?",
	}

	for _, classID := range classIDs {
		numSurveys := rand.Intn(11) + 10
		
		for i := 0; i < numSurveys; i++ {
			question := surveyQuestions[rand.Intn(len(surveyQuestions))]
			mark := rand.Intn(3) + 3 

			_, err := db.Exec(`
				INSERT INTO surveys (class_id, question, mark)
				VALUES ($1, $2, $3)
			`, classID, question, mark)

			if err == nil {
				countSurveys++
			}
		}
	}
	return nil
}
