FROM node:latest

RUN apt-get update -y \
&& apt-get -y install curl build-essential git ca-certificates

ENV DEBUG="notes:*,messages:*"
ENV SEQUELIZE_CONNECT="models/sequelize-docker-mysql.yaml"
ENV NOTES_MODEL="sequelize"
ENV USER_SERVICE_URL="http://svc-userauth:5858"
ENV PORT="3000"

RUN mkdir -p /notesapp /notesapp/partials /notesapp/public /notesapp/routes /notesapp/views
COPY models/*.mjs models/*.yaml /notesapp/models/
COPY partials/ /notesapp/partials/
COPY public/ /notesapp/public/
COPY routes/ /notesapp/routes/
COPY views/ /notesapp/views/
COPY *.mjs package.json /notesapp/
COPY .env /notesapp/
COPY logo-white.png /notesapp/

WORKDIR /notesapp

RUN npm install --unsafe-perm

VOLUME /sessions
EXPOSE 3000
CMD [ "node", "./app.mjs" ]
