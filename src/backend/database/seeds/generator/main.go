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

	"github.com/brianvoe/gofakeit/v6"
	_ "github.com/lib/pq"
)

var (
	polishFirstNames = []string{
		"Adam", "Piotr", "Krzysztof", "Andrzej", "Tomasz", "Jan", "Paweł", "Michał",
		"Marcin", "Marek", "Łukasz", "Jakub", "Mateusz", "Rafał", "Kamil", "Wojciech",
		"Bartosz", "Maciej", "Damian", "Grzegorz", "Sebastian", "Dawid", "Szymon", "Kacper",
		"Anna", "Maria", "Katarzyna", "Małgorzata", "Agnieszka", "Barbara", "Ewa", "Magdalena",
		"Joanna", "Krystyna", "Monika", "Teresa", "Beata", "Danuta", "Zofia", "Karolina",
		"Justyna", "Aleksandra", "Natalia", "Paulina", "Sylwia", "Weronika", "Patrycja",
		"Izabela", "Martyna", "Julia",
	}

	polishLastNames = []string{
		"Nowak", "Kowalski", "Wiśniewski", "Wójcik", "Kowalczyk", "Kamiński", "Lewandowski",
		"Zieliński", "Szymański", "Woźniak", "Dąbrowski", "Kozłowski", "Jankowski", "Mazur",
		"Kwiatkowski", "Wojciechowski", "Krawczyk", "Kaczmarek", "Piotrowski", "Grabowski",
		"Pawłowski", "Michalski", "Król", "Wieczorek", "Jabłoński", "Nowakowski", "Majewski",
		"Olszewski", "Jaworski", "Stępień", "Malinowski", "Dudek", "Zajączkowski", "Witkowski",
		"Walczak", "Górski", "Rutkowski", "Sikora", "Baran", "Pietrzak", "Marciniak",
		"Adamczyk", "Zalewski", "Ostrowski", "Bąk", "Szewczyk",
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

type Subject struct {
	id          int
	name        string
	facultyID   int
	description string
}

type Course struct {
	id   int
	name string
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

func transliterate(s string) string {
	replacements := map[rune]string{
		'ą': "a", 'Ą': "A",
		'ć': "c", 'Ć': "C",
		'ę': "e", 'Ę': "E",
		'ł': "l", 'Ł': "L",
		'ń': "n", 'Ń': "N",
		'ó': "o", 'Ó': "O",
		'ś': "s", 'Ś': "S",
		'ź': "z", 'Ź': "Z",
		'ż': "z", 'Ż': "Z",
	}

	var result strings.Builder
	for _, char := range s {
		if replacement, ok := replacements[char]; ok {
			result.WriteString(replacement)
		} else {
			result.WriteRune(char)
		}
	}
	return result.String()
}

func generateValidPESEL(birthDate time.Time, isFemale bool) string {
	year := birthDate.Year() % 100
	month := int(birthDate.Month())
	day := birthDate.Day()

	if birthDate.Year() >= 2000 && birthDate.Year() < 2100 {
		month += 20
	}

	serialFirst := rand.Intn(10)
	serialSecond := rand.Intn(10)
	
	genderDigit := rand.Intn(10)
	if isFemale && genderDigit%2 != 0 {
		genderDigit = (genderDigit + 1) % 10
	} else if !isFemale && genderDigit%2 == 0 {
		genderDigit = (genderDigit + 1) % 10
	}

	peselDigits := []int{
		year / 10, year % 10,
		month / 10, month % 10,
		day / 10, day % 10,
		serialFirst, serialSecond, genderDigit,
	}

	weights := []int{9, 7, 3, 1, 9, 7, 3, 1, 9}
	sum := 0
	for i := 0; i < 9; i++ {
		sum += peselDigits[i] * weights[i]
	}
	
	tentDigit := rand.Intn(10)
	sum += tentDigit * 7
	
	checksum := sum % 10

	return fmt.Sprintf("%02d%02d%02d%d%d%d%d%d",
		year, month, day, serialFirst, serialSecond, genderDigit, tentDigit, checksum)
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

func randomPhoneNumber() string {
	return fmt.Sprintf("+48%d%08d", rand.Intn(9)+1, rand.Intn(100000000))
}

func randomBankAccount() string {
	part1 := rand.Int63n(1000000000000)
	part2 := rand.Int63n(1000000000000)
	return fmt.Sprintf("PL%012d%012d", part1, part2)
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

	log.Println(" Connected to database")

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
		log.Fatalf("Failed to link course-subjects: %v", err)
	}

	if err := linkModuleSubjects(db); err != nil {
		log.Fatalf("Failed to link module-subjects: %v", err)
	}

	if err := generateAdditionalUsers(db, cfg); err != nil {
		log.Fatalf("Failed to generate users: %v", err)
	}

	if err := generateProductionRelations(db); err != nil {
		log.Fatalf("Failed to generate relations: %v", err)
	}

	printSummary(db)
	log.Println(" Database seeding completed successfully")
}

func generateSubjects(db *sql.DB) error {
	subjects := []struct {
		name        string
		alias       string
		ects        int
		description string
		syllabus    string
	}{
		{"Programowanie", "INF-101", 6, "Podstawy programowania", "Kurs wprowadzający do programowania w językach wysokiego poziomu"},
		{"Bazy danych", "INF-102", 5, "Systemy baz danych", "Projektowanie i implementacja relacyjnych baz danych"},
		{"Algorytmy i struktury danych", "INF-103", 6, "Projektowanie algorytmów", "Zaawansowane techniki algorytmiczne i struktury danych"},
		{"Inżynieria oprogramowania", "INF-104", 5, "Metodyki tworzenia oprogramowania", "Cykl życia projektu i metodyki agile"},
		{"Systemy operacyjne", "INF-105", 5, "Architektury systemów operacyjnych", "Procesy, wątki, zarządzanie pamięcią"},
		{"Sieci komputerowe", "INF-106", 5, "Protokoły sieciowe", "TCP/IP, routing, bezpieczeństwo sieci"},
		{"Sztuczna inteligencja", "INF-107", 6, "Uczenie maszynowe", "Algorytmy AI, sieci neuronowe, deep learning"},
		{"Grafika komputerowa", "INF-108", 4, "Renderowanie 3D", "OpenGL, raytracing, grafika czasu rzeczywistego"},
		{"Bezpieczeństwo IT", "INF-109", 5, "Kryptografia i bezpieczeństwo", "Kryptografia symetryczna i asymetryczna, PKI"},
		{"Aplikacje webowe", "INF-110", 6, "Frontend i backend", "HTML/CSS/JS, React, Node.js, REST API"},
		{"Programowanie mobilne", "INF-111", 5, "Android i iOS", "Kotlin, Swift, aplikacje natywne i hybrydowe"},
		{"Cloud Computing", "INF-112", 4, "AWS i Azure", "Infrastruktura chmurowa, konteneryzacja"},
		{"DevOps", "INF-113", 4, "CI/CD i automatyzacja", "Jenkins, GitLab CI, automatyzacja wdrożeń"},
		{"Blockchain", "INF-114", 4, "Technologie rozproszone", "Smart contracts, Ethereum, konsensus"},
		{"Internet Rzeczy", "INF-115", 5, "IoT i embedded systems", "Arduino, Raspberry Pi, protokoły IoT"},

		{"Algebra", "MAT-201", 6, "Algebra liniowa i abstrakcyjna", "Macierze, przestrzenie wektorowe, grupy"},
		{"Analiza matematyczna I", "MAT-202", 7, "Rachunek różniczkowy i całkowy", "Granice, pochodne, całki"},
		{"Analiza matematyczna II", "MAT-203", 7, "Równania różniczkowe", "ODEs, PDEs, metody rozwiązywania"},
		{"Geometria analityczna", "MAT-204", 5, "Geometria przestrzeni", "Wektory, płaszczyzny, powierzchnie"},
		{"Równania różniczkowe", "MAT-205", 6, "ODEs i PDEs", "Metody analityczne i numeryczne"},
		{"Rachunek prawdopodobieństwa", "MAT-206", 5, "Teoria prawdopodobieństwa", "Zmienne losowe, rozkłady, wartość oczekiwana"},
		{"Statystyka matematyczna", "MAT-207", 5, "Estymacja i testy", "Testy hipotez, analiza wariancji"},
		{"Topologia", "MAT-208", 5, "Przestrzenie topologiczne", "Otwarte i zamknięte zbiory, zwartość"},
		{"Teoria liczb", "MAT-209", 4, "Arytmetyka modularna", "Liczby pierwsze, kongruencje"},
		{"Kombinatoryka", "MAT-210", 4, "Metody kombinatoryczne", "Permutacje, kombinacje, zasada włączeń"},
		{"Optymalizacja", "MAT-211", 5, "Programowanie liniowe", "Sympleks, dualność, optymalizacja nieliniowa"},
		{"Teoria grafów", "MAT-212", 5, "Algorytmy grafowe", "Drzewa, najkrótsze ścieżki, przepływy"},
		{"Matematyka dyskretna", "MAT-213", 5, "Logika i zbiory", "Rachunki zdań, indukcja matematyczna"},
		{"Analiza funkcjonalna", "MAT-214", 6, "Przestrzenie Banacha", "Przestrzenie liniowe, operatory"},
		{"Teoria miary", "MAT-215", 6, "Miara Lebesgue'a", "Całka Lebesgue'a, przestrzenie mierzalne"},

		{"Fizyka klasyczna", "FIZ-301", 6, "Mechanika i termodynamika", "Mechanika Newtona, prawa termodynamiki"},
		{"Fizyka kwantowa", "FIZ-302", 7, "Mechanika kwantowa", "Równanie Schrödingera, kwantowanie"},
		{"Elektrodynamika", "FIZ-303", 6, "Teoria pola elektromagnetycznego", "Równania Maxwella, fale elektromagnetyczne"},
		{"Optyka", "FIZ-304", 5, "Fale świetlne", "Załamanie, dyfrakcja, interferencja"},
		{"Mechanika kwantowa zaawansowana", "FIZ-305", 7, "Operator Hamiltona", "Teoria perturbacji, spin"},
		{"Fizyka jądrowa", "FIZ-306", 6, "Reakcje jądrowe", "Rozpad radioaktywny, fuzja i rozszczepienie"},
		{"Fizyka ciała stałego", "FIZ-307", 6, "Struktura krystaliczna", "Sieci krystaliczne, fonony"},
		{"Astrofizyka", "FIZ-308", 5, "Ewolucja gwiazd", "Nukleosynteza, czarne dziury"},
		{"Fizyka cząstek elementarnych", "FIZ-309", 6, "Model standardowy", "Kwarki, leptony, oddziaływania"},
		{"Metody numeryczne w fizyce", "FIZ-310", 5, "Symulacje komputerowe", "Monte Carlo, dynamika molekularna"},
		{"Teoria względności", "FIZ-311", 6, "STW i OTW", "Transformacje Lorentza, tensory"},
		{"Fizyka plazmy", "FIZ-312", 5, "Plazma niskotemperaturowa", "Jonizacja, debye length"},
		{"Spektroskopia", "FIZ-313", 4, "Analiza spektralna", "Spektrometria mas, NMR"},
		{"Kriogenika", "FIZ-314", 4, "Niskie temperatury", "Nadprzewodnictwo, nadciekłość"},
		{"Nanotechnologia", "FIZ-315", 5, "Materiały nanometryczne", "Nanorurki, grafen, nanocząstki"},

		{"Mechanika techniczna", "MEC-401", 6, "Statyka i dynamika", "Równowaga, kinematyka, dynamika"},
		{"Elektronika", "MEC-402", 6, "Obwody elektroniczne", "Diody, tranzystory, wzmacniacze"},
		{"Sterowanie i automatyka", "MEC-403", 6, "Regulatory PID", "Regulatory, stabilność układów"},
		{"Robotyka", "MEC-404", 7, "Kinematyka robotów", "Manipulatory, planowanie ruchu"},
		{"CAD/CAM", "MEC-405", 5, "Projektowanie wspomagane", "SolidWorks, AutoCAD, CNC"},
		{"Napędy elektryczne", "MEC-406", 5, "Silniki AC i DC", "Silniki krokowe, serwo"},
		{"Programowanie sterowników PLC", "MEC-407", 6, "Ladder logic", "Siemens S7, Allen-Bradley"},
		{"Systemy wbudowane", "MEC-408", 6, "Mikrokontrolery", "ARM Cortex, STM32, RTOS"},
		{"Teoria maszyn", "MEC-409", 5, "Mechanizmy i przekładnie", "Przekładnie zębate, łożyska"},
		{"Pomiary przemysłowe", "MEC-410", 5, "Czujniki i przetworniki", "Tensometry, termopary, LVDT"},
		{"Materiałoznawstwo", "MEC-411", 4, "Właściwości materiałów", "Stal, aluminium, polimery"},
		{"Wytrzymałość materiałów", "MEC-412", 5, "Naprężenia i odkształcenia", "MES, analiza wytrzymałości"},
		{"Techniki wytwarzania", "MEC-413", 5, "Obróbka skrawaniem", "Toczenie, frezowanie, szlifowanie"},
		{"Pneumatyka i hydraulika", "MEC-414", 4, "Układy pneumatyczne", "Zawory, siłowniki, pompy"},
		{"Vision systems", "MEC-415", 5, "Przetwarzanie obrazu", "OpenCV, detekcja obiektów"},
	}

	for _, s := range subjects {
		_, err := db.Exec(`
			INSERT INTO subjects (name, alias, ECTS, description, syllabus)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (alias) DO NOTHING
		`, s.name, s.alias, s.ects, s.description, s.syllabus)

		if err != nil {
			return fmt.Errorf("failed to insert subject %s: %w", s.name, err)
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
		courseMode string
		degreeType string
		degree     string
		facultyID  int
	}{
		{"INF-I-1", "Informatyka", 1, 1, "stacjonarne", "inżynierskie", "1", 1},
		{"INF-I-2", "Informatyka", 1, 2, "stacjonarne", "inżynierskie", "1", 1},
		{"INF-I-3", "Informatyka", 2, 1, "stacjonarne", "inżynierskie", "1", 1},
		{"INF-M-1", "Informatyka", 1, 1, "stacjonarne", "inżynierskie", "2", 1},
		{"CYB-I-1", "Cyberbezpieczeństwo", 1, 1, "stacjonarne", "inżynierskie", "1", 1},
		{"AI-M-1", "Sztuczna Inteligencja", 1, 1, "stacjonarne", "magisterskie", "2", 1},

		{"MAT-I-1", "Matematyka", 1, 1, "stacjonarne", "inżynierskie", "1", 2},
		{"MAT-I-2", "Matematyka", 1, 2, "stacjonarne", "inżynierskie", "1", 2},
		{"MAT-M-1", "Matematyka", 1, 1, "stacjonarne", "magisterskie", "2", 2},
		{"MATS-I-1", "Matematyka stosowana", 1, 1, "stacjonarne", "inżynierskie", "1", 2},

		{"FIZ-I-1", "Fizyka", 1, 1, "stacjonarne", "inżynierskie", "1", 3},
		{"FIZ-I-2", "Fizyka", 1, 2, "stacjonarne", "inżynierskie", "1", 3},
		{"FIZ-M-1", "Fizyka", 1, 1, "stacjonarne", "magisterskie", "2", 3},
		{"FIZT-I-1", "Fizyka techniczna", 1, 1, "stacjonarne", "inżynierskie", "1", 3},

		{"MEC-I-1", "Mechatronika", 1, 1, "stacjonarne", "inżynierskie", "1", 4},
		{"MEC-I-2", "Mechatronika", 1, 2, "stacjonarne", "inżynierskie", "1", 4},
		{"MEC-M-1", "Mechatronika", 1, 1, "stacjonarne", "magisterskie", "2", 4},
		{"ROB-I-1", "Automatyka i robotyka", 1, 1, "stacjonarne", "inżynierskie", "1", 4},
	}

	for _, c := range courses {
		_, err := db.Exec(`
			INSERT INTO courses (alias, name, year, semester, course_mode, degree_type, degree, faculty_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, c.alias, c.name, c.year, c.semester, c.courseMode, c.degreeType, c.degree, c.facultyID)

		if err != nil {
			return fmt.Errorf("failed to insert course %s: %w", c.name, err)
		}
	}

	return nil
}

func generateModules(db *sql.DB) error {
	var courseIDs []int
	rows, err := db.Query("SELECT course_id FROM courses")
	if err != nil {
		return err
	}
	for rows.Next() {
		var id int
		rows.Scan(&id)
		courseIDs = append(courseIDs, id)
	}
	rows.Close()

	modules := []struct {
		alias     string
		name      string
		courseID  int
	}{
		{"MOD-INF-1", "Podstawy programowania", 1},
		{"MOD-INF-2", "Zaawansowane programowanie", 1},
		{"MOD-INF-3", "Systemy rozproszone", 2},
		{"MOD-INF-4", "Data Science", 3},

		{"MOD-MAT-1", "Matematyka dyskretna i algebra", 1},
		{"MOD-MAT-2", "Analiza matematyczna", 2},
		{"MOD-MAT-3", "Matematyka stosowana", 3},

		{"MOD-FIZ-1", "Mechanika klasyczna", 1},
		{"MOD-FIZ-2", "Fizyka współczesna", 2},
		{"MOD-FIZ-3", "Fizyka eksperymentalna", 3},

		{"MOD-MEC-1", "Podstawy mechatroniki", 1},
		{"MOD-MEC-2", "Elektronika przemysłowa", 2},
		{"MOD-MEC-3", "Automatyka", 3},
		{"MOD-MEC-4", "Robotyka przemysłowa", 4},
		{"MOD-MEC-5", "Systemy wbudowane i IoT", 5},
	}

	for i, m := range modules {
		courseID := courseIDs[i%len(courseIDs)]
		_, err := db.Exec(`
			INSERT INTO modules (alias, name, course_id)
			VALUES ($1, $2, $3)
		`, m.alias, m.name, courseID)

		if err != nil {
			return fmt.Errorf("failed to insert module %s: %w", m.name, err)
		}
	}

	return nil
}

func generateClasses(db *sql.DB) error {
	var subjectIDs []int
	rows, err := db.Query("SELECT subject_id FROM subjects")
	if err != nil {
		return err
	}
	for rows.Next() {
		var id int
		rows.Scan(&id)
		subjectIDs = append(subjectIDs, id)
	}
	rows.Close()

	var buildingIDs []int
	rows, err = db.Query("SELECT building_id FROM buildings")
	if err != nil {
		return err
	}
	for rows.Next() {
		var id int
		rows.Scan(&id)
		buildingIDs = append(buildingIDs, id)
	}
	rows.Close()

	classTypes := []string{"wykład", "ćwiczenia", "laboratorium", "projekt", "seminarium"}
	creditTypes := []string{"zaliczenie na ocenę", "kolokwium", "egzamin", "projekt"}

	for _, subjectID := range subjectIDs {
		numClasses := rand.Intn(3) + 2

		for i := 0; i < numClasses; i++ {
			classType := classTypes[rand.Intn(len(classTypes))]
			credit := creditTypes[rand.Intn(len(creditTypes))]
			spanOfHours := (rand.Intn(3) + 1) * 15
			groupNr := rand.Intn(5) + 1
			capacity := rand.Intn(80) + 20
			currentCapacity := rand.Intn(capacity + 1)
			classroom := rand.Intn(300) + 100
			buildingID := buildingIDs[rand.Intn(len(buildingIDs))]

			_, err := db.Exec(`
				INSERT INTO classes (class_type, credit, span_of_hours, group_nr, 
					current_capacity, capacity, classroom, building_id, subject_id)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			`, classType, credit, spanOfHours, groupNr, currentCapacity, capacity, 
				classroom, buildingID, subjectID)

			if err != nil {
				return fmt.Errorf("failed to insert class: %w", err)
			}
		}
	}

	return nil
}

func linkCourseSubjects(db *sql.DB) error {
	var courses []Course
	rows, err := db.Query("SELECT course_id, name FROM courses")
	if err != nil {
		return err
	}
	for rows.Next() {
		var c Course
		rows.Scan(&c.id, &c.name)
		courses = append(courses, c)
	}
	rows.Close()

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

	usedPhones := make(map[string]bool)
	usedBankAccounts := make(map[string]bool)
	usedPESELs := make(map[string]bool)

	for i := 0; i < 61; i++ {
		firstName := randomPolishName()
		lastName := randomPolishSurname()

		translitFirstName := strings.ToLower(transliterate(firstName))
		translitLastName := strings.ToLower(transliterate(lastName))

		email := fmt.Sprintf("%s.%s%d@student.edu.pl",
			translitFirstName,
			translitLastName,
			i+1)

		password := fmt.Sprintf("Student%d!", 1000+i)

		isFemale := strings.HasSuffix(firstName, "a")
		birthDate := time.Date(2000+rand.Intn(7), time.Month(rand.Intn(12)+1), rand.Intn(28)+1, 0, 0, 0, 0, time.UTC)
		
		var pesel string
		for {
			pesel = generateValidPESEL(birthDate, isFemale)
			if !usedPESELs[pesel] {
				usedPESELs[pesel] = true
				break
			}
		}

		var phoneNr string
		for {
			phoneNr = randomPhoneNumber()
			if !usedPhones[phoneNr] {
				usedPhones[phoneNr] = true
				break
			}
		}

		var bankAccount string
		for {
			bankAccount = randomBankAccount()
			if !usedBankAccounts[bankAccount] {
				usedBankAccounts[bankAccount] = true
				break
			}
		}

		user := map[string]interface{}{
			"email":                email,
			"password":             password,
			"name":                 firstName,
			"surname":              lastName,
			"role":                 "student",
			"pesel":                pesel,
			"phone_nr":             phoneNr,
			"postal_address":       randomBydgoszczAddress(),
			"registration_address": randomBydgoszczAddress(),
			"bank_account_nr":      bankAccount,
		}

		if err := registerUserViaAPI(cfg.APIURL, user); err != nil {
			log.Printf("  Warning: Failed to create student %s: %v", email, err)
		}

		time.Sleep(100 * time.Millisecond)
	}

	degrees := []string{"Dr", "Dr hab.", "Prof. dr hab."}
	titles := []string{"Adiunkt", "Profesor nadzwyczajny", "Profesor zwyczajny", "Wykładowca"}

	for i := 0; i < 20; i++ {
		firstName := randomPolishName()
		lastName := randomPolishSurname()

		translitFirstName := strings.ToLower(transliterate(firstName))
		translitLastName := strings.ToLower(transliterate(lastName))

		email := fmt.Sprintf("%s.%s%d@edu.pl",
			translitFirstName,
			translitLastName,
			i+1)

		password := fmt.Sprintf("Teacher%d!", 2000+i)
		facultyID := rand.Intn(4) + 1

		isFemale := strings.HasSuffix(firstName, "a")
		birthDate := time.Date(1970+rand.Intn(21), time.Month(rand.Intn(12)+1), rand.Intn(28)+1, 0, 0, 0, 0, time.UTC)
		
		var pesel string
		for {
			pesel = generateValidPESEL(birthDate, isFemale)
			if !usedPESELs[pesel] {
				usedPESELs[pesel] = true
				break
			}
		}

		var phoneNr string
		for {
			phoneNr = randomPhoneNumber()
			if !usedPhones[phoneNr] {
				usedPhones[phoneNr] = true
				break
			}
		}

		var bankAccount string
		for {
			bankAccount = randomBankAccount()
			if !usedBankAccounts[bankAccount] {
				usedBankAccounts[bankAccount] = true
				break
			}
		}

		user := map[string]interface{}{
			"email":                email,
			"password":             password,
			"name":                 firstName,
			"surname":              lastName,
			"role":                 "teacher",
			"pesel":                pesel,
			"phone_nr":             phoneNr,
			"postal_address":       randomBydgoszczAddress(),
			"registration_address": randomBydgoszczAddress(),
			"bank_account_nr":      bankAccount,
			"degree":               degrees[rand.Intn(len(degrees))],
			"title":                titles[rand.Intn(len(titles))],
			"faculty_id":           facultyID,
		}

		if err := registerUserViaAPI(cfg.APIURL, user); err != nil {
			log.Printf("  Warning: Failed to create teacher %s: %v", email, err)
		}

		time.Sleep(100 * time.Millisecond)
	}

	adminRoles := []string{"Dziekan", "Prodziekan", "Kierownik Dziekanatu", "Sekretarz", "Administrator IT"}

	for i := 0; i < 10; i++ {
		firstName := randomPolishName()
		lastName := randomPolishSurname()

		translitFirstName := strings.ToLower(transliterate(firstName))
		translitLastName := strings.ToLower(transliterate(lastName))

		email := fmt.Sprintf("%s.%s%d@admin.edu.pl",
			translitFirstName,
			translitLastName,
			i+1)

		password := fmt.Sprintf("Admin%d!", 3000+i)
		facultyID := rand.Intn(4) + 1

		isFemale := strings.HasSuffix(firstName, "a")
		birthDate := time.Date(1975+rand.Intn(21), time.Month(rand.Intn(12)+1), rand.Intn(28)+1, 0, 0, 0, 0, time.UTC)
		
		var pesel string
		for {
			pesel = generateValidPESEL(birthDate, isFemale)
			if !usedPESELs[pesel] {
				usedPESELs[pesel] = true
				break
			}
		}

		var phoneNr string
		for {
			phoneNr = randomPhoneNumber()
			if !usedPhones[phoneNr] {
				usedPhones[phoneNr] = true
				break
			}
		}

		var bankAccount string
		for {
			bankAccount = randomBankAccount()
			if !usedBankAccounts[bankAccount] {
				usedBankAccounts[bankAccount] = true
				break
			}
		}

		user := map[string]interface{}{
			"email":                email,
			"password":             password,
			"name":                 firstName,
			"surname":              lastName,
			"role":                 "admin",
			"pesel":                pesel,
			"phone_nr":             phoneNr,
			"postal_address":       randomBydgoszczAddress(),
			"registration_address": randomBydgoszczAddress(),
			"bank_account_nr":      bankAccount,
			"faculty_id":           facultyID,
			"admin_role":           adminRoles[rand.Intn(len(adminRoles))],
		}

		if err := registerUserViaAPI(cfg.APIURL, user); err != nil {
			log.Printf("  Warning: Failed to create admin %s: %v", email, err)
		}

		time.Sleep(100 * time.Millisecond)
	}

	var finalCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&finalCount); err != nil {
		return err
	}

	log.Printf("Total users in database: %d", finalCount)
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
				return nil
			}
			return fmt.Errorf(msg)
		}
		return fmt.Errorf("registration failed")
	}

	return nil
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

			if err != nil {
				return fmt.Errorf("failed to insert course instructor: %w", err)
			}
		}
	}

	for _, albumNr := range studentAlbums {
		numClasses := rand.Intn(6) + 3

		shuffled := make([]int, len(classIDs))
		copy(shuffled, classIDs)
		rand.Shuffle(len(shuffled), func(i, j int) {
			shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
		})

		for i := 0; i < numClasses && i < len(shuffled); i++ {
			_, err := db.Exec(`
				INSERT INTO student_classes (album_nr, class_id)
				VALUES ($1, $2)
				ON CONFLICT DO NOTHING
			`, albumNr, shuffled[i])

			if err != nil {
				return fmt.Errorf("failed to insert student class: %w", err)
			}
		}
	}

	gradeValues := []string{"2.0", "3.0", "3.5", "4.0", "4.5", "5.0"}

	if len(teacherIDs) == 0 {
		return nil
	}

	for _, albumNr := range studentAlbums {
		rows, err := db.Query(`
			SELECT sc.class_id, c.subject_id 
			FROM student_classes sc
			JOIN classes c ON sc.class_id = c.class_id
			WHERE sc.album_nr = $1
		`, albumNr)

		if err != nil {
			return err
		}

		var enrollments []struct {
			classID   int
			subjectID int
		}

		for rows.Next() {
			var e struct {
				classID   int
				subjectID int
			}
			rows.Scan(&e.classID, &e.subjectID)
			enrollments = append(enrollments, e)
		}
		rows.Close()

		numGrades := rand.Intn(len(enrollments)/2) + 1
		if numGrades > len(enrollments) {
			numGrades = len(enrollments)
		}

		shuffled := make([]int, len(enrollments))
		for i := range enrollments {
			shuffled[i] = i
		}
		rand.Shuffle(len(shuffled), func(i, j int) {
			shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
		})

		for i := 0; i < numGrades; i++ {
			idx := shuffled[i]
			gradeValue := gradeValues[rand.Intn(len(gradeValues))]
			weight := rand.Intn(3) + 1
			attempt := 1
			teacherID := teacherIDs[rand.Intn(len(teacherIDs))]

			_, err := db.Exec(`
				INSERT INTO grades (album_nr, class_id, subject_id, value, weight, attempt, added_by_teaching_staff_id)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
			`, albumNr, enrollments[idx].classID, enrollments[idx].subjectID, gradeValue, weight, attempt, teacherID)

			if err != nil {
				return fmt.Errorf("failed to insert grade: %w", err)
			}
		}
	}

	var userIDs []int
	rows, err = db.Query("SELECT user_id FROM users")
	if err != nil {
		return err
	}
	for rows.Next() {
		var id int
		rows.Scan(&id)
		userIDs = append(userIDs, id)
	}
	rows.Close()

	messageTitles := []string{
		"Zmiana terminu zajęć",
		"Konsultacje",
		"Egzamin",
		"Projekt zaliczeniowy",
		"Materiały do zajęć",
		"Spotkanie grupowe",
		"Wyniki testu",
		"Literatura dodatkowa",
		"Przypomnienie o terminie",
		"Spotkanie online",
	}

	for i := 0; i < 80; i++ {
		senderID := userIDs[rand.Intn(len(userIDs))]
		title := messageTitles[rand.Intn(len(messageTitles))]
		content := gofakeit.Paragraph(2, 5, 10, " ")
		sentAt := time.Date(2024, time.Month(10+rand.Intn(2)), rand.Intn(28)+1, rand.Intn(24), rand.Intn(60), 0, 0, time.UTC)

		var messageID int
		err := db.QueryRow(`
			INSERT INTO messages (sender_id, title, content, send_date)
			VALUES ($1, $2, $3, $4)
			RETURNING message_id
		`, senderID, title, content, sentAt).Scan(&messageID)

		if err != nil {
			return fmt.Errorf("failed to insert message: %w", err)
		}

		numRecipients := rand.Intn(3) + 1
		shuffled := make([]int, len(userIDs))
		copy(shuffled, userIDs)
		rand.Shuffle(len(shuffled), func(i, j int) {
			shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
		})

		for j := 0; j < numRecipients && j < len(shuffled); j++ {
			if shuffled[j] == senderID {
				continue
			}

			var readAt *time.Time

			if rand.Float32() < 0.6 {
					readTime := time.Now().Add(-time.Duration(rand.Intn(48)) * time.Hour)
					readAt = &readTime
			}
			_, err := db.Exec(`
				INSERT INTO message_recipients (message_id, recipient_id, read_at)
				VALUES ($1, $2, $3)
			`, messageID, shuffled[j], readAt)

			if err != nil {
				return fmt.Errorf("failed to insert message recipient: %w", err)
			}
		}
	}

	applicationCategoryNames := []string{
		"Stypendium socjalne",
		"Urlop dziekański",
		"Zapomoga",
		"Stypendium naukowe",
		"Wymiana zagraniczna",
	}

	var categoryIDs []int
	for _, categoryName := range applicationCategoryNames {
			var categoryID int
			
			err := db.QueryRow(`
					SELECT category_id FROM application_categories WHERE name = $1
			`, categoryName).Scan(&categoryID)
			
			if err != nil {
					// Jeśli nie istnieje, utwórz ją
					startDate := time.Date(2024, 9, 1, 0, 0, 0, 0, time.UTC)
					endDate := time.Date(2025, 6, 30, 0, 0, 0, 0, time.UTC)
					
					err = db.QueryRow(`
							INSERT INTO application_categories (name, description, application_start_date, application_end_date, active)
							VALUES ($1, $2, $3, $4, true)
							RETURNING category_id
					`, categoryName, fmt.Sprintf("Wniosek dotyczący: %s", categoryName), startDate, endDate).Scan(&categoryID)
					
					if err != nil {
							return fmt.Errorf("failed to insert application category: %w", err)
					}
			}
			
			categoryIDs = append(categoryIDs, categoryID)
	}

	statuses := []string{"submitted", "under_review", "approved", "rejected"}
	titles := []string{
			"Wniosek o stypendium",
			"Wniosek o urlop",
			"Wniosek o zapomogę",
			"Wniosek o wymianę",
			"Wniosek o dofinansowanie",
	}

	for i := 0; i < 50; i++ {
			studentAlbum := studentAlbums[rand.Intn(len(studentAlbums))]
			categoryID := categoryIDs[rand.Intn(len(categoryIDs))]
			status := statuses[rand.Intn(len(statuses))]
			title := titles[rand.Intn(len(titles))]
			content := gofakeit.Paragraph(3, 5, 12, " ")

			_, err := db.Exec(`
					INSERT INTO applications (category_id, album_nr, title, content, status, created_at, updated_at)
					VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
			`, categoryID, studentAlbum, title, content, status)

			if err != nil {
					return fmt.Errorf("failed to insert application: %w", err)
			}
	}
	var subjectIDs []int
	subjectRows, err := db.Query("SELECT subject_id FROM subjects")
	if err != nil {
		return err
	}
	for subjectRows.Next() {
		var id int
		subjectRows.Scan(&id)
		subjectIDs = append(subjectIDs, id)
	}
	subjectRows.Close()

	for i := 0; i < 100; i++ {
		classID := classIDs[rand.Intn(len(classIDs))]
		
		questions := []string{
			"Czy zajęcia były dobrze zorganizowane?",
			"Czy materiały były pomocne?",
			"Czy prowadzący był kompetentny?",
			"Czy formy zaliczenia były sprawiedliwe?",
			"Czy zajęcia były interesujące?",
		}
		
		question := questions[rand.Intn(len(questions))]
		mark := rand.Intn(5) + 1

		_, err := db.Exec(`
			INSERT INTO surveys (class_id, question, mark)
			VALUES ($1, $2, $3)
		`, classID, question, mark)

		if err != nil {
			return fmt.Errorf("failed to insert survey: %w", err)
		}
	}
		ptrTime := func(t time.Time) *time.Time {
			return &t
	}

	academicYears := []struct {
			year      string
			startYear int
	}{
			{"2020/2021", 2020},
			{"2021/2022", 2021},
			{"2022/2023", 2022},
			{"2023/2024", 2023},
			{"2024/2025", 2024},
	}

	for _, ay := range academicYears {
			year := ay.startYear
			academicYear := ay.year

			calendarEvents := []struct {
					eventType   string
					title       string
					description string
					startDate   time.Time
					endDate     *time.Time
					appliesTo   string
			}{
					// SEMESTR ZIMOWY
					{
							eventType:   "registration",
							title:       "Rejestracja na zajęcia - semestr zimowy",
							description: "Okres zapisów na zajęcia w semestrze zimowym",
							startDate:   time.Date(year, 9, 15, 0, 0, 0, 0, time.UTC),
							endDate:     ptrTime(time.Date(year, 9, 30, 23, 59, 59, 0, time.UTC)),
							appliesTo:   "all",
					},
					{
							eventType:   "semester_start",
							title:       "Rozpoczęcie semestru zimowego",
							description: "Pierwszy dzień zajęć w semestrze zimowym",
							startDate:   time.Date(year, 10, 1, 0, 0, 0, 0, time.UTC),
							endDate:     nil,
							appliesTo:   "all",
					},
					{
							eventType:   "holiday",
							title:       "Święto Wszystkich Świętych",
							description: "Dzień wolny od zajęć",
							startDate:   time.Date(year, 11, 1, 0, 0, 0, 0, time.UTC),
							endDate:     nil,
							appliesTo:   "all",
					},
					{
							eventType:   "holiday",
							title:       "Święto Niepodległości",
							description: "Dzień wolny od zajęć - rocznica odzyskania niepodległości",
							startDate:   time.Date(year, 11, 11, 0, 0, 0, 0, time.UTC),
							endDate:     nil,
							appliesTo:   "all",
					},
					{
							eventType:   "break",
							title:       "Przerwa świąteczna",
							description: "Przerwa w zajęciach z okazji świąt Bożego Narodzenia i Nowego Roku",
							startDate:   time.Date(year, 12, 23, 0, 0, 0, 0, time.UTC),
							endDate:     ptrTime(time.Date(year+1, 1, 2, 23, 59, 59, 0, time.UTC)),
							appliesTo:   "all",
					},
					{
							eventType:   "exam_session",
							title:       "Sesja egzaminacyjna zimowa",
							description: "Sesja egzaminacyjna dla semestru zimowego",
							startDate:   time.Date(year+1, 1, 20, 0, 0, 0, 0, time.UTC),
							endDate:     ptrTime(time.Date(year+1, 2, 10, 23, 59, 59, 0, time.UTC)),
							appliesTo:   "all",
					},
					{
							eventType:   "semester_end",
							title:       "Zakończenie semestru zimowego",
							description: "Ostatni dzień semestru zimowego",
							startDate:   time.Date(year+1, 2, 10, 0, 0, 0, 0, time.UTC),
							endDate:     nil,
							appliesTo:   "all",
					},
					// SEMESTR LETNI
					{
							eventType:   "registration",
							title:       "Rejestracja na zajęcia - semestr letni",
							description: "Okres zapisów na zajęcia w semestrze letnim",
							startDate:   time.Date(year+1, 2, 1, 0, 0, 0, 0, time.UTC),
							endDate:     ptrTime(time.Date(year+1, 2, 20, 23, 59, 59, 0, time.UTC)),
							appliesTo:   "all",
					},
					{
							eventType:   "semester_start",
							title:       "Rozpoczęcie semestru letniego",
							description: "Pierwszy dzień zajęć w semestrze letnim",
							startDate:   time.Date(year+1, 2, 24, 0, 0, 0, 0, time.UTC),
							endDate:     nil,
							appliesTo:   "all",
					},
					{
							eventType:   "break",
							title:       "Przerwa wielkanocna",
							description: "Przerwa w zajęciach z okazji świąt wielkanocnych",
							startDate:   time.Date(year+1, 4, 14, 0, 0, 0, 0, time.UTC),
							endDate:     ptrTime(time.Date(year+1, 4, 18, 23, 59, 59, 0, time.UTC)),
							appliesTo:   "all",
					},
					{
							eventType:   "holiday",
							title:       "Święto Pracy",
							description: "Dzień wolny od zajęć",
							startDate:   time.Date(year+1, 5, 1, 0, 0, 0, 0, time.UTC),
							endDate:     nil,
							appliesTo:   "all",
					},
					{
							eventType:   "holiday",
							title:       "Święto Konstytucji 3 Maja",
							description: "Dzień wolny od zajęć - rocznica uchwalenia Konstytucji",
							startDate:   time.Date(year+1, 5, 3, 0, 0, 0, 0, time.UTC),
							endDate:     nil,
							appliesTo:   "all",
					},
					{
							eventType:   "exam_session",
							title:       "Sesja egzaminacyjna letnia",
							description: "Sesja egzaminacyjna dla semestru letniego",
							startDate:   time.Date(year+1, 6, 10, 0, 0, 0, 0, time.UTC),
							endDate:     ptrTime(time.Date(year+1, 6, 30, 23, 59, 59, 0, time.UTC)),
							appliesTo:   "all",
					},
					{
							eventType:   "semester_end",
							title:       "Zakończenie semestru letniego",
							description: "Ostatni dzień semestru letniego",
							startDate:   time.Date(year+1, 6, 30, 0, 0, 0, 0, time.UTC),
							endDate:     nil,
							appliesTo:   "all",
					},
					{
							eventType:   "exam_session",
							title:       "Sesja poprawkowa",
							description: "Sesja egzaminacyjna poprawkowa",
							startDate:   time.Date(year+1, 9, 1, 0, 0, 0, 0, time.UTC),
							endDate:     ptrTime(time.Date(year+1, 9, 14, 23, 59, 59, 0, time.UTC)),
							appliesTo:   "all",
					},
			}

			for _, event := range calendarEvents {
					var endDate interface{}
					if event.endDate != nil {
							endDate = *event.endDate
					} else {
							endDate = nil
					}

					_, err := db.Exec(`
							INSERT INTO academic_calendar (event_type, title, description, start_date, end_date, academic_year, applies_to, is_recurring)
							VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
					`, event.eventType, event.title, event.description, event.startDate, endDate, academicYear, event.appliesTo, false)

					if err != nil {
							return fmt.Errorf("failed to insert academic calendar event: %w", err)
					}
			}
	}


	var messageIDs []int
	rows, err = db.Query("SELECT message_id FROM messages")
	if err != nil {
			return err
	}
	for rows.Next() {
			var id int
			rows.Scan(&id)
			messageIDs = append(messageIDs, id)
	}
	rows.Close()

	var applicationIDs []int
	rows, err = db.Query("SELECT application_id FROM applications")
	if err != nil {
			return err
	}
	for rows.Next() {
			var id int
			rows.Scan(&id)
			applicationIDs = append(applicationIDs, id)
	}
	rows.Close()

	fileTypes := []struct {
			extension string
			mimeType  string
			prefix    string
	}{
			{".pdf", "application/pdf", "dokument"},
			{".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "raport"},
			{".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "arkusz"},
			{".jpg", "image/jpeg", "zdjecie"},
			{".png", "image/png", "obraz"},
			{".txt", "text/plain", "notatka"},
			{".zip", "application/zip", "archiwum"},
	}

	numMessageAttachments := len(messageIDs) * 30 / 100
	for i := 0; i < numMessageAttachments; i++ {
			messageID := messageIDs[rand.Intn(len(messageIDs))]
			fileType := fileTypes[rand.Intn(len(fileTypes))]
			
			originalFilename := fmt.Sprintf("%s_%d%s", fileType.prefix, rand.Intn(1000), fileType.extension)
			filename := fmt.Sprintf("%d_%s", time.Now().Unix()+int64(i), originalFilename)
			filePath := fmt.Sprintf("/uploads/messages/%d/%s", messageID, filename)
			fileSize := int64(rand.Intn(5000000) + 10000) // 10KB - 5MB

			_, err := db.Exec(`
					INSERT INTO attachments (message_id, filename, original_filename, file_size, mime_type, file_path)
					VALUES ($1, $2, $3, $4, $5, $6)
			`, messageID, filename, originalFilename, fileSize, fileType.mimeType, filePath)

			if err != nil {
					return fmt.Errorf("failed to insert message attachment: %w", err)
			}
	}

	numApplicationAttachments := len(applicationIDs) * 40 / 100
	for i := 0; i < numApplicationAttachments; i++ {
			applicationID := applicationIDs[rand.Intn(len(applicationIDs))]
			
			fileType := fileTypes[0] // PDF
			if rand.Float32() < 0.2 {
					fileType = fileTypes[3] // czasem zdjęcie/skan
			}
			
			originalFilename := fmt.Sprintf("zalacznik_wniosku_%d%s", rand.Intn(1000), fileType.extension)
			filename := fmt.Sprintf("%d_%s", time.Now().Unix()+int64(i), originalFilename)
			filePath := fmt.Sprintf("/uploads/applications/%d/%s", applicationID, filename)
			fileSize := int64(rand.Intn(3000000) + 50000) // 50KB - 3MB

			_, err := db.Exec(`
					INSERT INTO attachments (application_id, filename, original_filename, file_size, mime_type, file_path)
					VALUES ($1, $2, $3, $4, $5, $6)
			`, applicationID, filename, originalFilename, fileSize, fileType.mimeType, filePath)

			if err != nil {
					return fmt.Errorf("failed to insert application attachment: %w", err)
			}
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


