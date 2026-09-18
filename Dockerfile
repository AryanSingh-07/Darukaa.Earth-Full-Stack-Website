FROM node:22-alpine AS frontend-build
WORKDIR /workspace
COPY package.json package-lock.json* ./
COPY frontend/package.json ./frontend/package.json
RUN npm install
COPY frontend ./frontend
RUN npm run build

FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
COPY --from=frontend-build /workspace/frontend/dist ./frontend/dist
EXPOSE 8000
CMD ["sh", "-c", "python -m alembic -c backend/alembic.ini upgrade head && uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
