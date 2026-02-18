# Node.js 18 버전을 기반으로 이미지를 생성합니다.
FROM node:18

# 앱 디렉토리를 생성합니다.
WORKDIR /usr/src/app

# 앱 의존성을 설치하기 위해 package.json과 package-lock.json을 복사합니다.
COPY package*.json ./
RUN npm install

# 앱 소스 코드를 복사합니다.
COPY . .

EXPOSE 3000
CMD [ "node", "server.js" ]