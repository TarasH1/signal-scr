# Use Node 22 slim for a smaller image
FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies first (for caching)
COPY package*.json ./
RUN npm install

# Copy source and build the frontend
COPY . .
RUN npm run build

# Final production stage
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the built frontend and the server source
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts

# Expose the application port
EXPOSE 3000

# Start the server using tsx (which is now in dependencies)
CMD ["npx", "tsx", "server.ts"]
