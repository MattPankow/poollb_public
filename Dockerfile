FROM node:24.13.0-alpine3.23

WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

EXPOSE 3000

CMD ["npm", "start"]

