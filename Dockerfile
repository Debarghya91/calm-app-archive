FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8787 DB_FILE=/data/soulspace.db
WORKDIR /app
COPY backend ./backend
COPY www ./www
RUN mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","backend/server.js"]
