# latest official node image
FROM node:carbon-alpine

MAINTAINER paul@mindres.in

# use cached layer for node modules
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /usr/app && cp -a /tmp/node_modules /usr/app/

# add project files
WORKDIR /usr/app
ADD . /usr/app

CMD ["npm", "start"]
