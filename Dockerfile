# 사용할 Node.js 버전을 선택합니다.
FROM node:20.6.0-slim

# 작업 디렉토리를 설정합니다.
WORKDIR /app

# 애플리케이션 종속성을 복사합니다.
COPY package*.json ./

# 종속성을 설치합니다.
RUN npm install

# 소스 코드를 현재 디렉토리로 복사합니다.
COPY . .

# 포트 3000을 노출합니다 (Express 애플리케이션의 기본 포트).
EXPOSE 3000

# 컨테이너를 실행할 명령을 정의합니다.
CMD [ "node", "main.js" ]
