FROM node:8

RUN apt-get update && apt-get install postgresql-client dos2unix -y

RUN mkdir /app
WORKDIR /app

COPY package.json .
RUN npm install yarn -g
RUN yarn
RUN yarn add pg

COPY ./test/.env .
COPY ./test/wait-for-it.sh .

RUN chmod +x /app/wait-for-it.sh
RUN dos2unix /app/wait-for-it.sh

COPY . .
