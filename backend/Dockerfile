FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm set fetch-retries 5 \
 && npm set fetch-retry-factor 2 \
 && npm set fetch-retry-mintimeout 10000 \
 && if [ -f package-lock.json ]; then \
			npm ci --no-audit --prefer-offline || (for i in 1 2 3; do npm install --no-audit && break || (echo "npm install failed, retrying ($i)" && sleep 3); done); \
		else \
			for i in 1 2 3; do npm install --no-audit && break || (echo "npm install failed, retrying ($i)" && sleep 3); done; \
		fi

COPY . .
RUN npx prisma generate

EXPOSE 5000
CMD ["npm", "run", "dev"]
