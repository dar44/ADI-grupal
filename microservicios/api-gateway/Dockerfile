FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Crear directorio public para el frontend
RUN mkdir -p public

EXPOSE 3000

CMD ["node", "src/server.js"]
