FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY next.config.ts* ./
COPY tsconfig.json* ./

RUN npm ci 

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
