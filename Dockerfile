# Multi-stage Dockerfile: build Angular frontend then run Node server

### Frontend build stage
FROM node:20 AS frontend-builder
WORKDIR /app/frontend

# Copy frontend sources and install dev dependencies for build
COPY frontend/package*.json ./
COPY frontend/ ./
RUN npm install --legacy-peer-deps
RUN npm run build --silent

### Production stage
FROM node:20-slim
WORKDIR /usr/src/app

# Install only production dependencies for the server
COPY package*.json ./
RUN npm install --production --silent || npm install --silent

# Copy server source
COPY src/ ./src/
COPY loadEnv.js ./

# Copy other top-level files that server may need


# Copy frontend build output from builder into the place the server expects
RUN mkdir -p frontend/dist/frontend/browser
COPY --from=frontend-builder /app/frontend/dist/frontend/browser frontend/dist/frontend/browser

EXPOSE 3000
CMD ["node", "src/server.js"]
