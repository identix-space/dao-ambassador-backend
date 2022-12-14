FROM node:16 as modules
WORKDIR /app
COPY package*.json ./
RUN npm i --legacy-peer-deps

FROM modules as app
WORKDIR /app
COPY . ./
RUN npm run db:gen
EXPOSE 4000
CMD ["npm", "start"]
