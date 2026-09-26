# =========================================================
# 1단계: Spring Boot 애플리케이션 빌드
# =========================================================

FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /app


# Gradle Wrapper 복사
COPY gradlew .
COPY gradle gradle


# Gradle 설정 파일 복사
COPY build.gradle .
COPY settings.gradle .


# Spring Boot 소스 복사
COPY src src


# Windows CRLF 문제 방지 + 실행 권한 부여
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew


# Spring Boot 실행 JAR 생성
RUN ./gradlew clean bootJar --no-daemon



# =========================================================
# 2단계: 실제 애플리케이션 실행
# =========================================================

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app


# 1단계에서 생성한 JAR만 가져옴
COPY --from=build /app/build/libs/*.jar app.jar


# Spring Boot 기본 포트
EXPOSE 8080


# 컨테이너 실행 시 Spring Boot 실행
ENTRYPOINT ["java", "-jar", "app.jar"]