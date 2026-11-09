FROM node:26.12.1-alpine
ARG MCP_VERSION=latest
RUN npm install -g @transloadit/mcp-server@${MCP_VERSION}
USER node
ENTRYPOINT ["transloadit-mcp", "stdio"]
