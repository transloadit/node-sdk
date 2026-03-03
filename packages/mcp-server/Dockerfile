FROM node:22-alpine
RUN npm install -g @transloadit/mcp-server@latest
USER node
ENTRYPOINT ["transloadit-mcp", "stdio"]
