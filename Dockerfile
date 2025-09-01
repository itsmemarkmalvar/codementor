# Next.js Frontend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies but keep TypeScript for runtime
RUN npm prune --production && npm install typescript

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
