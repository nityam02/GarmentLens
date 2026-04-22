FROM node:20-alpine

RUN apk add --no-cache python3 make g++ curl

WORKDIR /app
COPY package.json ./
RUN npm install --production

COPY src/ ./src/

RUN mkdir -p /app/uploads /app/data

ENV SERVICE_PORT=3001
ENV UPLOAD_DIR=/app/uploads
ENV NODE_ENV=production

EXPOSE 3001
CMD ["node", "src/index.js"]
