FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

ENV NODE_ENV=production
RUN npm run build

EXPOSE 3000

COPY start.sh ./start.sh
RUN chmod +x start.sh

CMD ["sh", "start.sh"]
