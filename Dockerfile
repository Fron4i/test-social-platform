FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN npm ci --omit=dev

EXPOSE 3000

CMD ["npm", "start"]