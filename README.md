# Luxora E-commerce

Projet React + Vite en frontend et Express + Prisma en backend.

## Modes de lancement

### Mode local recommande

Utilise le frontend et le backend en local, avec uniquement PostgreSQL dans Docker.

```bash
npm install
npm run dev:db
npm run dev
```

URLs :

- Frontend : `http://localhost:5173`
- Backend : `http://localhost:5000`
- Swagger : `http://localhost:5000/api-docs`

Le backend local lit [backend/.env](backend/.env) et pointe vers `localhost:5432`.

Avant le premier lancement backend, synchronise le schema Prisma si besoin :

```bash
cd backend
npx prisma db push
```

### Mode Docker pour le backend

Utilise PostgreSQL + backend dans Docker, et garde seulement le frontend en local.

```bash
npm run docker:up
npm run dev:frontend:docker
```

URLs :

- Frontend : `http://localhost:5173`
- Backend Docker : `http://localhost:5001`
- Swagger : `http://localhost:5001/api-docs`

Le backend Docker lit [backend/.env.docker](backend/.env.docker), et le frontend utilise [.env.docker](.env.docker).

## Scripts utiles

```bash
npm run dev
npm run dev:db
npm run dev:frontend
npm run dev:frontend:docker
npm run docker:up
npm run docker:down
npm run docker:logs:backend
```

