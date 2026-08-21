# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Express backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# Stage 3: Production Runner image
FROM node:20-alpine AS runner
WORKDIR /app

# Copy root configurations
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma

# Install production dependencies (includes ts-node, typescript, and prisma since they are in dependencies)
RUN npm install --omit=dev
RUN npm install --prefix backend --omit=dev

# Copy compiled files
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Run migrations, seed the database, and start the Express server
WORKDIR /app/backend
RUN npx prisma generate

CMD npx prisma db push && npx ts-node prisma/seed.ts && node dist/index.js
