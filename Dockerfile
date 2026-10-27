FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM dependencies AS migrator
COPY prisma ./prisma
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
RUN npm prune --omit=dev
EXPOSE 3000
CMD ["npm", "run", "start"]
