# Utilise une image Node.js légère
FROM node:20-slim

# Installe Chromium pour Puppeteer
RUN apt-get update && \
  apt-get install -y chromium && \
  rm -rf /var/lib/apt/lists/*

# Crée le dossier de l'application
WORKDIR /app

# Copie les fichiers package.json et package-lock.json
COPY package*.json ./

# Installe les dépendances
RUN npm install

# Copie tout le reste
COPY . .

# Expose le port (utile si tu utilises un keepAlive)
EXPOSE 3000

# Lance le bot
CMD ["node", "src/index.js"]
