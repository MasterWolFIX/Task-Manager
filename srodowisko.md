# Środowisko deweloperskie — Docker / Laravel Sail

---

## 1. Wymagania wstępne

Zainstaluj na swoim systemie:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS) lub Docker Engine (Linux)
- [Git](https://git-scm.com/)
- PHP 8.3 + Composer (tylko do pierwszego `composer install`, potem wszystko w kontenerze)

Sprawdź czy Docker działa:

```bash
docker --version
docker compose version
```

---

## 2. Tworzenie nowego projektu Laravel z Sail

```bash
# Tworzy nowy projekt Laravel z Sail w katalogu "projekt"
curl -s "https://laravel.build/projekt?with=mysql,redis,mailpit" | bash

cd projekt
```

> Jeśli wolisz PostgreSQL zamiast MySQL:
> ```bash
> curl -s "https://laravel.build/projekt?with=pgsql,redis,mailpit" | bash
> ```

---

## 3. Uruchomienie środowiska

```bash
# Pierwsze uruchomienie (buduje obrazy — może potrwać kilka minut)
./vendor/bin/sail up -d

# Skrót — dodaj alias do ~/.bashrc lub ~/.zshrc
alias sail='./vendor/bin/sail'

# Odtąd używasz po prostu:
sail up -d       # start w tle
sail down        # zatrzymanie
sail restart     # restart
```

---

## 4. Struktura kontenerów (docker-compose.yml)

Laravel Sail domyślnie uruchomi te kontenery:

| Kontener | Obraz | Port lokalny |
|----------|-------|-------------|
| `laravel.test` | PHP 8.3 + Nginx | `http://localhost:80` |
| `mysql` | MySQL 8.0 | `localhost:3306` |
| `redis` | Redis 7 | `localhost:6379` |
| `mailpit` | Mailpit | `http://localhost:8025` |

> Mailpit to lokalny serwer mailowy — wszystkie maile wysyłane przez aplikację trafiają tu zamiast do prawdziwych skrzynek.

---

## 5. Konfiguracja `.env`

Plik `.env` w katalogu projektu — uzupełnij/sprawdź te wartości:

```env
APP_NAME="[NAZWA PROJEKTU]"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

# --- Baza danych ---
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=projekt
DB_USERNAME=sail
DB_PASSWORD=password

# --- Redis ---
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# --- Mail (Mailpit lokalnie) ---
MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@projekt.local"
MAIL_FROM_NAME="${APP_NAME}"

# --- Kolejki ---
QUEUE_CONNECTION=redis

# --- Reverb (WebSockets) ---
REVERB_APP_ID=my-app-id
REVERB_APP_KEY=my-app-key
REVERB_APP_SECRET=my-app-secret
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

> Jeśli używasz PostgreSQL, zmień:
> ```env
> DB_CONNECTION=pgsql
> DB_HOST=pgsql
> DB_PORT=5432
> ```

---

## 6. Pierwsze uruchomienie — komendy startowe

Po `sail up -d` wykonaj jednorazowo:

```bash
# Instalacja zależności PHP
sail composer install

# Wygenerowanie klucza aplikacji
sail artisan key:generate

# Migracja bazy danych
sail artisan migrate

# (opcjonalnie) Seed z danymi testowymi
sail artisan db:seed

# Instalacja zależności JS
sail npm install

# Kompilacja assetów (dev)
sail npm run dev
```

---

## 7. Baza danych

### Połączenie z bazą z zewnątrz (np. TablePlus / DBeaver)

| Parametr | Wartość |
|----------|---------|
| Host | `127.0.0.1` |
| Port | `3306` (MySQL) lub `5432` (PostgreSQL) |
| Database | `projekt` |
| Username | `sail` |
| Password | `password` |

### Przydatne komendy

```bash
# Uruchomienie migracji
sail artisan migrate

# Cofnięcie ostatniej migracji
sail artisan migrate:rollback

# Reset i ponowna migracja z seedami
sail artisan migrate:fresh --seed

# Wejście do MySQL CLI
sail mysql

# Wejście do PostgreSQL CLI
sail psql
```

---

## 8. Redis

Redis pełni dwie role: **cache** i **kolejki zadań** (np. wysyłka maili, eventy).

```bash
# Podgląd kolejki (worker)
sail artisan queue:work

# Wejście do Redis CLI
sail redis-cli

# Sprawdzenie zawartości (np. sesje)
sail redis-cli keys "*"
```

---

## 9. Laravel Reverb (WebSockets)

Reverb to self-hosted serwer WebSocket — nie potrzebujesz Pushera ani zewnętrznych usług.

```bash
# Instalacja Reverb
sail composer require laravel/reverb
sail artisan reverb:install

# Uruchomienie serwera WebSocket
sail artisan reverb:start

# Uruchomienie z logowaniem
sail artisan reverb:start --debug
```

Reverb domyślnie działa na porcie `8080`. Upewnij się że port jest otwarty jeśli używasz firewalla.

---

## 10. Uruchamianie wszystkich procesów naraz

W trakcie dewelopmentu będziesz potrzebował jednocześnie:

```bash
# Terminal 1 — kontenery Docker
sail up -d

# Terminal 2 — worker kolejek
sail artisan queue:work

# Terminal 3 — serwer WebSocket
sail artisan reverb:start

# Terminal 4 — kompilacja JS (hot reload)
sail npm run dev
```

> Możesz też użyć pakietu `laravel/horizon` do zarządzania kolejkami przez panel webowy.

---

## 11. Przydatne komendy Sail

```bash
sail up -d              # start kontenerów w tle
sail down               # zatrzymanie kontenerów
sail restart            # restart
sail logs               # logi wszystkich kontenerów
sail logs mysql         # logi konkretnego kontenera
sail shell              # wejście do powłoki kontenera PHP
sail artisan [cmd]      # dowolna komenda artisan
sail composer [cmd]     # composer wewnątrz kontenera
sail npm [cmd]          # npm wewnątrz kontenera
sail tinker             # Laravel Tinker (REPL)
```

---

## 12. Dostęp do usług w przeglądarce

| Usługa | URL |
|--------|-----|
| Aplikacja | http://localhost |
| Mailpit (maile) | http://localhost:8025 |
| Reverb (WebSocket) | ws://localhost:8080 |

---

*Środowisko deweloperskie — wersja 1.0*
