# Środowisko deweloperskie — Node.js + Next.js + PostgreSQL

---

## 1. Wymagania wstępne

Zainstaluj na swoim systemie:

- [Node.js 20 LTS](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — dla PostgreSQL
- [Git](https://git-scm.com/)

Sprawdź wersje:

```bash
node --version    # v20.x.x
npm --version
docker --version
```

---

## 2. Struktura projektu — inicjalizacja

```bash
mkdir projekt && cd projekt
mkdir backend frontend

# Inicjalizacja Git
git init
```

Plik `.gitignore` w katalogu głównym:

```
node_modules/
.env
.env.local
dist/
uploads/
.next/
```

---

## 3. Docker — baza danych PostgreSQL

Plik `docker-compose.yml` w katalogu głównym:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: projekt_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: projekt
      POSTGRES_USER: projekt_user
      POSTGRES_PASSWORD: projekt_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  adminer:
    image: adminer
    container_name: projekt_adminer
    restart: unless-stopped
    ports:
      - "8080:8080"

volumes:
  postgres_data:
```

Uruchomienie bazy:

```bash
# Start w tle
docker compose up -d

# Sprawdzenie statusu
docker compose ps

# Zatrzymanie
docker compose down

# Logi bazy
docker compose logs postgres
```

---

## 4. Backend — Express.js

### Inicjalizacja

```bash
cd backend
npm init -y
```

### Instalacja pakietów

```bash
# Produkcyjne
npm install express socket.io jsonwebtoken bcryptjs multer adm-zip \
            drizzle-orm pg zod nodemailer winston cors dotenv

# Dev
npm install -D typescript tsx @types/express @types/node @types/jsonwebtoken \
               @types/bcryptjs @types/multer @types/pg @types/cors \
               drizzle-kit
```

### `backend/package.json` — skrypty

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/db/seed.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

### `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

### `backend/drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### `backend/.env`

```env
NODE_ENV=development
PORT=4000

DATABASE_URL=postgresql://projekt_user:projekt_pass@localhost:5432/projekt

JWT_SECRET=zmien_na_losowy_string_min_32_znaki
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=inny_losowy_string_min_32_znaki
JWT_REFRESH_EXPIRES_IN=7d

UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
ALLOWED_ZIP_EXTENSIONS=php,py,js,ts,jsx,tsx,html,css,scss,sass,txt,md,json,yaml,yml,xml,sql,sh,bash,c,cpp,h,java,kt,go,rs,vue,cs,rb,swift

MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_FROM=noreply@projekt.local

FRONTEND_URL=http://localhost:3000
```

---

## 5. Frontend — Next.js 14

### Inicjalizacja

```bash
cd ../frontend
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
```

### Instalacja pakietów

```bash
npm install socket.io-client react-hook-form zod @hookform/resolvers \
            react-dropzone react-markdown zustand \
            @codemirror/view @codemirror/state \
            @codemirror/lang-javascript @codemirror/lang-python \
            @codemirror/lang-php @codemirror/theme-one-dark

# shadcn/ui
npx shadcn-ui@latest init
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

---

## 6. Pierwsze uruchomienie

```bash
# 1. Uruchom bazę danych
docker compose up -d

# 2. Uruchom migracje
cd backend
npm run db:migrate

# 3. Seed z domyślnymi danymi
npm run db:seed

# 4. Uruchom backend (osobny terminal)
npm run dev

# 5. Uruchom frontend (osobny terminal)
cd ../frontend
npm run dev
```

---

## 7. Dostęp do usług

| Usługa | URL |
|--------|-----|
| Frontend (Next.js) | http://localhost:3000 |
| Backend (Express) | http://localhost:4000 |
| Adminer (baza) | http://localhost:8080 |
| Drizzle Studio | http://localhost:4983 |

---

## 8. Połączenie z bazą z zewnątrz (TablePlus / DBeaver)

| Parametr | Wartość |
|----------|---------|
| Host | `127.0.0.1` |
| Port | `5432` |
| Database | `projekt` |
| Username | `projekt_user` |
| Password | `projekt_pass` |

---

## 9. Przydatne komendy

```bash
# Reset bazy od zera
docker compose down -v && docker compose up -d
cd backend && npm run db:migrate && npm run db:seed

# Podgląd bazy przez Drizzle Studio
cd backend && npm run db:studio

# Build produkcyjny backendu
cd backend && npm run build && npm start

# Build produkcyjny frontendu
cd frontend && npm run build && npm start
```

---

*Środowisko deweloperskie — wersja 2.1*