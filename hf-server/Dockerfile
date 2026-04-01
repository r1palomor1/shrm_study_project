# Use Node.js 20 as base image
FROM node:20

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose the port HF Spaces requires
EXPOSE 7860

# CMD to run the server
CMD ["node", "index.mjs"]
