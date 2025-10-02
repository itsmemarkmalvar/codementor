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

# Build the application with environment variables
ARG NEXT_PUBLIC_API_URL=https://codementor-java.com/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN echo "Build-time NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
RUN npm run build

# Remove dev dependencies but keep TypeScript for runtime
RUN npm prune --production && npm install typescript

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
