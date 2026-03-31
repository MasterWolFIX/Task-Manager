# Wymagania projektowe — [NAZWA PROJEKTU]

> System do zarządzania zadaniami na lekcji: nauczyciel tworzy i przydziela zadania, uczniowie rozwiązują i odsyłają rozwiązania w tej samej aplikacji.

---

## 1. Informacje ogólne

| Pole | Wartość |
|------|---------|
| Nazwa projektu | [NAZWA PROJEKTU] |
| Typ aplikacji | Webowa aplikacja full-stack (monorepo) |
| Stack technologiczny | Express.js + Next.js 14 (App Router) |
| Baza danych | PostgreSQL 16 |
| Real-time | Socket.io |
| Repozytorium | Jedno repo Git — foldery `backend/` i `frontend/` |
| Dostępność | Intranet szkolny + publiczny internet |
| Wersja dokumentu | 2.0 |

---

## 2. Cel projektu

System umożliwia nauczycielowi tworzenie zadań programistycznych i przydzielanie ich uczniom w czasie rzeczywistym. Uczniowie rozwiązują zadania bezpośrednio w aplikacji — wklejając kod lub wysyłając archiwum `.zip`. Nauczyciel widzi postępy na żywo, przegląda rozwiązania i wystawia oceny z komentarzem — wszystko w jednym miejscu, bez zewnętrznych narzędzi.

---

## 3. Role użytkowników

### 3.1 Administrator (Nauczyciel)

- Tworzy, edytuje i usuwa zadania
- Przydziela zadania do klas lub wybranych uczniów
- Widzi w czasie rzeczywistym kto oddał zadanie i kiedy
- Przegląda przesłany kod z podświetlaniem składni (read-only)
- Pobiera przesłane pliki `.zip`
- Przegląda zawartość `.zip` bez pobierania (lista plików + podgląd)
- Wystawia ocenę (1–6) i opcjonalny komentarz tekstowy
- Zarządza kontami uczniów i klasami
- Konfiguruje limity systemowe (max rozmiar ZIP, max długość kodu) przez panel admina

### 3.2 Uczeń

- Loguje się do systemu
- Widzi listę przydzielonych zadań z terminem oddania
- Oddaje rozwiązanie w jednym z dwóch trybów:
  - **Kod jako tekst** — edytor z podświetlaniem składni
  - **Plik .zip** — upload archiwum (max. konfigurowalny)
- Może nadpisać rozwiązanie przed upływem terminu
- Widzi status zadania: `nie oddano` / `oczekuje na ocenę` / `oceniono`
- Widzi wystawioną ocenę i komentarz nauczyciela

---

## 4. Wymagania funkcjonalne

### 4.1 Autoryzacja

- [ ] Konta uczniów zakładane wyłącznie przez administratora
- [ ] Logowanie: e-mail + hasło (JWT — access token + refresh token)
- [ ] Role: `admin`, `student`
- [ ] Reset hasła przez e-mail
- [ ] Automatyczne wylogowanie po czasie określonym w ustawieniach

### 4.2 Zarządzanie klasami

- [ ] Tworzenie i usuwanie klas (np. „3A Informatyka")
- [ ] Dodawanie i usuwanie uczniów z klasy
- [ ] Przydzielanie zadań do całej klasy lub pojedynczych uczniów

### 4.3 Moduł zadań — widok nauczyciela

- [ ] Tworzenie zadania: tytuł, treść (Markdown), język, termin oddania
- [ ] Opcjonalny plik startowy do pobrania (szkielet kodu)
- [ ] Lista uczniów z kolorowym statusem: `nie oddano` / `oddano` / `oceniono`
- [ ] Powiadomienie (Socket.io) gdy uczeń odda zadanie — w czasie rzeczywistym
- [ ] Podgląd kodu ucznia z podświetlaniem składni (CodeMirror 6, read-only)
- [ ] Pobieranie pliku `.zip` od ucznia
- [ ] Podgląd zawartości `.zip` bez pobierania:
  - Drzewo plików i katalogów z ikonami typów
  - Kliknięcie pliku tekstowego otwiera jego zawartość w CodeMirror (read-only) z podświetlaniem składni dobranym automatycznie do rozszerzenia
  - Pliki binarne (obrazki, exe itp.) pokazują tylko nazwę i rozmiar bez podglądu
  - Informacja o łącznym rozmiarze archiwum i liczbie plików
- [ ] Formularz oceniania: ocena 1–6 + pole na komentarz

### 4.4 Moduł zadań — widok ucznia

- [ ] Lista zadań z filtrem: aktywne / archiwalne / ocenione
- [ ] Widok szczegółowy zadania: treść, termin, opcjonalny plik startowy
- [ ] Formularz oddawania — uczeń wybiera tryb:
  - **Tryb kod**: edytor CodeMirror 6, wybór języka (PHP, Python, JavaScript, inne)
  - **Tryb ZIP**: drag & drop upload, walidacja rozszerzenia i rozmiaru
- [ ] Autosave kodu co 30 sekund (localStorage)
- [ ] Możliwość nadpisania rozwiązania przed upływem terminu
- [ ] Powiadomienie (Socket.io) gdy nauczyciel wystawi ocenę
- [ ] Widok oceny i komentarza

### 4.5 Panel administratora

- [ ] Panel dostępny pod `/admin` (chroniony rolą `admin`)
- [ ] Zarządzanie użytkownikami: tworzenie, edycja, reset hasła, dezaktywacja
- [ ] Zarządzanie klasami i przypisaniami uczniów
- [ ] Przegląd wszystkich zadań i oddanych rozwiązań
- [ ] **Ustawienia systemowe** — edytowalne limity w tabeli `settings`:
  - Max rozmiar pliku ZIP (domyślnie: 10 MB)
  - Max długość kodu jako tekstu (domyślnie: 100 000 znaków)
  - Dozwolone rozszerzenia w ZIP (domyślnie: `php,py,js,ts,jsx,tsx,html,css,scss,sass,txt,md,json,yaml,yml,xml,sql,sh,bash,c,cpp,h,java,kt,go,rs,vue,cs,rb,swift`)
  - Czas sesji przed wylogowaniem (domyślnie: 60 minut)
- [ ] Logi aktywności: logowania, oddania zadań, zmiany ocen, edycje ustawień
- [ ] Widgety na dashboardzie: oddania dziś, nieocenione, aktywni uczniowie

### 4.6 Powiadomienia real-time

- [ ] Socket.io jako serwer WebSocket (zintegrowany z Express)
- [ ] Kanał nauczyciela: nowe oddanie zadania przez ucznia
- [ ] Kanał ucznia: wystawienie oceny przez nauczyciela

---

## 5. Wymagania niefunkcjonalne

| Kategoria | Wymaganie |
|-----------|-----------|
| Bezpieczeństwo | Pliki ZIP walidowane po rozszerzeniu i rozmiarze, nigdy wykonywane |
| Bezpieczeństwo | Kod ucznia wyświetlany tylko jako tekst, nigdy wykonywany po stronie serwera |
| Bezpieczeństwo | Pliki dostępne tylko dla właściciela i nauczyciela (nie publiczny URL) |
| Bezpieczeństwo | JWT przechowywane w httpOnly cookie |
| Wydajność | Czas ładowania strony < 2 s przy 30 jednoczesnych użytkownikach |
| Dostępność | Responsywny interfejs — desktop i tablet |
| Dostępność | Działanie w intranecie szkolnym (bez zewnętrznego internetu) oraz przez publiczny internet |
| Przechowywanie | Pliki ZIP w `uploads/submissions/{user_id}/{task_id}/` |
| Limity | Max rozmiar pliku ZIP: **konfigurowalny** (domyślnie 10 MB) |
| Limity | Max długość kodu jako tekstu: **konfigurowalny** (domyślnie 100 000 znaków) |
| Limity | Dozwolone rozszerzenia w ZIP: **konfigurowalny** (domyślnie php, py, js, ts, html, css, txt) |
| Kopie zapasowe | Dzienny backup bazy danych i katalogu `uploads` |

---

## 6. Schemat bazy danych (PostgreSQL)

### `settings`
```sql
id          SERIAL PRIMARY KEY,
key         VARCHAR(100) UNIQUE NOT NULL,
value       TEXT NOT NULL,
type        VARCHAR(20) NOT NULL,  -- 'int' | 'string' | 'bool' | 'array'
description VARCHAR(255),
updated_at  TIMESTAMP DEFAULT NOW()
```

Domyślne rekordy:

| key | value | type |
|-----|-------|------|
| `max_zip_size_mb` | `10` | int |
| `max_code_length` | `100000` | int |
| `allowed_zip_extensions` | `php,py,js,ts,jsx,tsx,html,css,scss,sass,txt,md,json,yaml,yml,xml,sql,sh,bash,c,cpp,h,java,kt,go,rs,vue,cs,rb,swift` | string |
| `session_timeout_minutes` | `60` | int |

### `users`
```sql
id          SERIAL PRIMARY KEY,
name        VARCHAR(100) NOT NULL,
email       VARCHAR(150) UNIQUE NOT NULL,
password    VARCHAR(255) NOT NULL,
role        VARCHAR(20) NOT NULL DEFAULT 'student',
is_active   BOOLEAN DEFAULT TRUE,
created_at  TIMESTAMP DEFAULT NOW(),
updated_at  TIMESTAMP DEFAULT NOW()
```

### `classes`
```sql
id          SERIAL PRIMARY KEY,
name        VARCHAR(100) NOT NULL,
description TEXT,
created_at  TIMESTAMP DEFAULT NOW(),
updated_at  TIMESTAMP DEFAULT NOW()
```

### `class_user`
```sql
class_id    INT REFERENCES classes(id) ON DELETE CASCADE,
user_id     INT REFERENCES users(id) ON DELETE CASCADE,
PRIMARY KEY (class_id, user_id)
```

### `tasks`
```sql
id                SERIAL PRIMARY KEY,
title             VARCHAR(200) NOT NULL,
description       TEXT NOT NULL,
language          VARCHAR(50),
deadline          TIMESTAMP NOT NULL,
created_by        INT REFERENCES users(id),
starter_file_path VARCHAR(500),
created_at        TIMESTAMP DEFAULT NOW(),
updated_at        TIMESTAMP DEFAULT NOW()
```

### `task_assignments`
```sql
id          SERIAL PRIMARY KEY,
task_id     INT REFERENCES tasks(id) ON DELETE CASCADE,
user_id     INT REFERENCES users(id) ON DELETE CASCADE,
class_id    INT REFERENCES classes(id) ON DELETE CASCADE,
assigned_at TIMESTAMP DEFAULT NOW()
```

### `submissions`
```sql
id           SERIAL PRIMARY KEY,
task_id      INT REFERENCES tasks(id) ON DELETE CASCADE,
user_id      INT REFERENCES users(id) ON DELETE CASCADE,
type         VARCHAR(10) NOT NULL,  -- 'zip' | 'code'
code_content TEXT,
language     VARCHAR(50),
file_path    VARCHAR(500),
submitted_at TIMESTAMP DEFAULT NOW(),
updated_at   TIMESTAMP DEFAULT NOW(),
grade        SMALLINT,
feedback     TEXT,
graded_at    TIMESTAMP
```

### `activity_logs`
```sql
id          SERIAL PRIMARY KEY,
user_id     INT REFERENCES users(id) ON DELETE SET NULL,
action      VARCHAR(100) NOT NULL,
entity      VARCHAR(100),
entity_id   INT,
meta        JSONB,
ip_address  VARCHAR(45),
created_at  TIMESTAMP DEFAULT NOW()
```

---

## 7. Stack technologiczny

### Backend (Express.js)

| Pakiet | Zastosowanie |
|--------|-------------|
| express | Framework HTTP |
| socket.io | WebSockets real-time |
| jsonwebtoken | JWT auth (access + refresh token) |
| bcryptjs | Hashowanie haseł |
| multer | Upload plików ZIP |
| adm-zip | Podgląd zawartości ZIP bez wypakowania |
| pg + node-postgres | Klient PostgreSQL |
| drizzle-orm | ORM (lekki, type-safe) |
| zod | Walidacja danych wejściowych |
| nodemailer | Wysyłka maili |
| winston | Logowanie zdarzeń |

### Frontend (Next.js 14)

| Technologia | Zastosowanie |
|-------------|-------------|
| Next.js 14 (App Router) | Framework React z SSR/SSC |
| Tailwind CSS | Stylowanie |
| shadcn/ui | Gotowe komponenty UI |
| CodeMirror 6 | Edytor kodu z podświetlaniem składni |
| socket.io-client | Real-time po stronie klienta |
| react-hook-form + zod | Formularze z walidacją |
| react-dropzone | Drag & drop upload ZIP |
| react-markdown | Renderowanie treści zadań |
| zustand | Globalny state (auth, ustawienia) |

### Obsługiwane języki w edytorze

PHP, Python, JavaScript, TypeScript, HTML, CSS, SQL, Bash, Java, C, C++

### Środowisko lokalne

- Docker Compose (PostgreSQL, Redis opcjonalnie)
- Node.js 20 LTS
- pnpm (zarządzanie pakietami w monorepo)

### Środowisko produkcyjne (propozycja)

- VPS (np. Hetzner CX22)
- Nginx jako reverse proxy
- PM2 do zarządzania procesem Node.js
- PostgreSQL 16 jako usługa systemowa lub kontener
- Możliwość pracy w zamkniętym intranecie bez dostępu do zewnętrznych CDN

---

## 8. Struktura monorepo

```
[projekt]/
├── backend/                        ← Express.js
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── tasks.routes.ts
│   │   │   ├── submissions.routes.ts
│   │   │   ├── classes.routes.ts
│   │   │   └── settings.routes.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── role.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── submission.service.ts
│   │   │   ├── zip.service.ts
│   │   │   └── settings.service.ts
│   │   ├── db/
│   │   │   ├── schema.ts           ← Drizzle schema
│   │   │   └── seed.ts
│   │   ├── socket/
│   │   │   └── events.ts           ← Socket.io eventy
│   │   └── index.ts
│   ├── uploads/
│   │   └── submissions/{user_id}/{task_id}/
│   ├── package.json
│   └── .env
│
├── frontend/                       ← Next.js 14
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (student)/
│   │   │   ├── tasks/
│   │   │   └── submissions/
│   │   └── admin/
│   │       ├── dashboard/
│   │       ├── tasks/
│   │       ├── users/
│   │       ├── classes/
│   │       └── settings/
│   ├── components/
│   │   ├── editor/                 ← CodeMirror 6
│   │   ├── zip-upload/             ← Drag & drop
│   │   └── ui/                     ← shadcn/ui
│   ├── package.json
│   └── .env.local
│
└── docker-compose.yml
```

---

## 9. Harmonogram (propozycja)

| Etap | Zakres | Czas |
|------|--------|------|
| 1 | Setup monorepo, Docker, TypeScript, ESLint | 1 dzień |
| 2 | Baza danych — schema Drizzle, migracje, seed | 1 dzień |
| 3 | Autoryzacja JWT (login, refresh, role) | 2 dni |
| 4 | API — zadania, klasy, przypisania | 3 dni |
| 5 | Upload ZIP + podgląd zawartości | 2 dni |
| 6 | Socket.io — eventy real-time | 2 dni |
| 7 | Frontend — widok ucznia (lista, edytor, upload) | 4 dni |
| 8 | Frontend — panel admina (dashboard, ustawienia, logi) | 4 dni |
| 9 | Testy, poprawki, wdrożenie | 3 dni |
| **Łącznie** | | **~22 dni robocze** |

---

## 10. Otwarte kwestie do ustalenia

- [ ] Jaka będzie ostateczna nazwa projektu?
- [ ] Czy potrzebna jest obsługa wielu nauczycieli jednocześnie?
- [ ] Czy pliki ZIP mają być przechowywane lokalnie czy w chmurze (S3/MinIO)?
- [ ] Czy uczniowie mają widzieć rozwiązania innych uczniów po terminie?
- [ ] Czy wymagany jest eksport ocen do pliku CSV / Excel?

---

*Dokument wygenerowany dla projektu [NAZWA PROJEKTU] — wersja 2.0*
