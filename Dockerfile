# Dockerfile

# 1. Base Image
FROM node:18-alpine

# 2. Create App Directory
WORKDIR /usr/src/app

# 3. Install Dependencies
COPY package*.json ./
RUN npm install --force

# 4. Copy Source Code
COPY . .

# 5. Build the App
RUN npm run build

# 6. Expose Port (Standard NestJS port)
EXPOSE 3000

# 7. Start Command
CMD ["npm", "run", "start:prod"]