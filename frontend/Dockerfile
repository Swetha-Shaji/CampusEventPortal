FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Start Vite dev server exposing to the network
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]