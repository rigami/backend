# stage 1 as builder
FROM node:18.10.0 as builder

WORKDIR /app

# Copy in the package file as well as other yarn
# dependencies in the local directory, assuming the
# yarn berry release module is inside .yarn/releases
# already

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install the dependencies and make the folder
RUN yarn install

COPY . .

# Build the project and copy the files
RUN yarn build

EXPOSE 8080

ENTRYPOINT ["yarn", "start:prod"]
