# The Gloz server, for any host that runs a container (Northflank for the public demo).
# Keys come from the host's environment, never from this image.
FROM node:24-slim
WORKDIR /gloz
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY app/src ./app/src
# Speech goes to a hosted Whisper (NEAR AI on the demo) instead of the 700 MB local model, so 512 MB is enough.
ENV PORT=8080 GLOZ_DATA=/data GLOZ_STT_LOCAL=0
EXPOSE 8080
CMD ["node", "server/index.mjs"]
