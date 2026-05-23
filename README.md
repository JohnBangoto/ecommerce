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

## Variables d'environnement

- [backend/.env.example](backend/.env.example) : exemple pour le backend local
- [backend/.env.docker](backend/.env.docker) : configuration backend Docker
- [.env.example](.env.example) : exemple pour le frontend local
- [.env.docker](.env.docker) : configuration frontend quand le backend tourne dans Docker

La variable frontend utilisee est `VITE_API_BASE_URL`.

Variables backend importantes :

- `JWT_SECRET` : obligatoire, au moins 32 caracteres
- `SEED_ADMIN_PASSWORD` : mot de passe admin utilise par le seed local
- `CORS_ORIGINS` : liste CSV des origines frontend autorisees

Le seed ne cree plus de compte admin faible de type `admin/admin`.

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

## Notes securite

- Les routes backend utilisent maintenant des validations de payload, du rate limiting et des headers HTTP de securite.
- Le detail d'une commande n'est plus public par simple ID.
- Le suivi invite passe par un lien securise avec jeton de suivi.
- Si tu recrées les donnees de dev, pense a conserver le lien de suivi genere apres checkout.

## Pourquoi le port 5000 plantait

Le backend local et le backend Docker tentaient tous les deux d'utiliser `localhost:5000`.

Maintenant :

- le backend local ecoute sur `5000`
- le backend Docker est expose sur `5001`

Tu peux donc utiliser les deux modes sans conflit de port sur la machine.
