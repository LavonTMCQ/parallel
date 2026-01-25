FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./ 

# Install dependencies
# Note: In a real monorepo, we would copy the lockfile and root package.json too
RUN npm install

# Copy source
COPY src ./src

# Build
RUN npm run build

# Start
CMD ["npm", "start"]
