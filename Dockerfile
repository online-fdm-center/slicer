FROM node:10
WORKDIR /app
RUN curl -SL https://github.com/slic3r/Slic3r/releases/download/1.3.0/slic3r-1.3.0-linux-x64.tar.bz2 | tar xvj
COPY package.json .
RUN yarn install --prod
COPY index.js .
COPY dist ./dist
ENTRYPOINT node .