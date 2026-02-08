# 1. Base Image
FROM node:18-alpine

# 2. Create App Directory
WORKDIR /usr/src/app

# 3. Install Dependencies
COPY package*.json ./

# --- FIX START ---
# Force delete the conflicting lock file and install ignoring peer deps
RUN rm -f package-lock.json
RUN npm install --legacy-peer-deps
# --- FIX END ---

# 4. Copy Source Code
COPY . .

# 5. Build the App
RUN npm run build

# 6. Expose Port
EXPOSE 3000

# 7. Start Command
CMD ["npm", "run", "start:prod"]