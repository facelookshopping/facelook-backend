FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# 1. Remove any pre-existing lock files or node_modules
RUN rm -rf package-lock.json node_modules

# 2. Install dependencies ignoring all conflicts
# We use --force AND --legacy-peer-deps together
RUN npm install --force --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]