# =========================================================
# 1단계: React(Vite) 빌드
# =========================================================
FROM node:24-alpine AS build

WORKDIR /app


# package.json / package-lock.json 복사
COPY package*.json ./


# 의존성 설치
RUN npm ci


# React 프로젝트 전체 복사
COPY . .


# Vite production build
RUN npm run build



# =========================================================
# 2단계: Nginx로 React 정적 파일 서비스
# =========================================================
FROM nginx:alpine


# 우리가 작성할 Nginx 설정 적용
COPY nginx.conf /etc/nginx/conf.d/default.conf


# Vite build 결과물 복사
COPY --from=build /app/dist /usr/share/nginx/html


EXPOSE 80