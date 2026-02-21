# Node.js 18-alpine 버전을 사용하여 이미지 크기를 최적화합니다.
FROM node:18-alpine

# 백엔드 코드를 위한 작업 디렉토리를 설정합니다.
WORKDIR /usr/src/app

# 백엔드 의존성을 설치합니다.
# 먼저 package.json 파일을 복사하여 Docker의 레이어 캐시를 활용합니다.
COPY backend/package*.json ./
RUN npm install

# 백엔드 소스 코드를 작업 디렉토리(/usr/src/app)에 복사합니다.
COPY backend/ .

# 프론트엔드 코드를 작업 디렉토리 내의 'frontend' 폴더로 복사합니다.
COPY frontend/ ./frontend/

# 앱이 3000번 포트를 사용하도록 외부에 알립니다.
EXPOSE 3000

# 컨테이너가 시작될 때 실행할 명령어를 정의합니다.
# WORKDIR에 server.js가 있으므로 바로 실행합니다.
CMD [ "node", "server.js" ]