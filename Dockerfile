# The Gloz server, for any host that runs a container (Northflank for the public demo).
# Keys come from the host's environment, never from this image.
FROM node:24-slim
WORKDIR /gloz
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install --no-save @huggingface/transformers && npm cache clean --force
COPY server ./server
COPY app/src ./app/src
ENV PORT=8080 GLOZ_DATA=/data
EXPOSE 8080
CMD ["node", "server/index.mjs"]
