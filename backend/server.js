require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require(path.join(__dirname, 'User'));

const app = express();

// CORS 옵션 설정: 개발 환경과 Capacitor 앱 환경에서의 요청을 허용합니다.
const corsOptions = {
  origin: ['http://localhost:3000', 'capacitor://localhost', 'http://localhost'],
  optionsSuccessStatus: 200
};

// 미들웨어 설정
app.use(cors(corsOptions));
app.use(express.json());

// 초기 관리자 계정 생성 함수
const createAdminAccount = async () => {
    try {
        const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL, ADMIN_COUNTRY, ADMIN_BIRTHDATE } = process.env;

        // .env 파일에 관리자 정보가 없으면 생성하지 않음
        if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_EMAIL) {
            console.log('초기 관리자 계정 정보가 .env 파일에 설정되지 않았습니다. 관리자 생성을 건너뜁니다.');
            return;
        }

        // 관리자 계정이 이미 존재하는지 확인
        const existingAdmin = await User.findOne({ username: ADMIN_USERNAME });
        if (existingAdmin) {
            console.log('관리자 계정이 이미 존재합니다.');
            return;
        }

        // 새 관리자 계정 생성
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

        const adminUser = new User({
            username: ADMIN_USERNAME,
            password: hashedPassword,
            email: ADMIN_EMAIL,
            country: ADMIN_COUNTRY || 'KR',
            birthdate: ADMIN_BIRTHDATE || '1970-01-01',
            role: 'admin'
        });

        await adminUser.save();
        console.log(`초기 관리자 계정 '${ADMIN_USERNAME}'이(가) 성공적으로 생성되었습니다.`);
    } catch (error) {
        console.error('초기 관리자 계정 생성 중 오류 발생:', error);
    }
};

// MongoDB 연결
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected...');
        createAdminAccount(); // DB 연결 후 관리자 계정 생성 시도
    })
    .catch(err => console.log(err));

//! ============================================================
//! 라우팅 설정
//! 요청 처리 순서가 매우 중요합니다.
//! 1. 특정 동적 라우트 -> 2. API 라우트 -> 3. 정적 파일 -> 4. SPA 대체 경로
//! ============================================================

const frontendPath = path.join(__dirname, 'frontend', 'www');

// 1. 동적 설정 제공 라우트 (/config.js)
// API 라우트나 정적 파일보다 먼저 처리되어야 합니다.
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  const isProduction = process.env.NODE_ENV === 'production';
  const apiUrl = isProduction 
    ? (process.env.PROD_API_URL || 'http://35.199.151.16/api')
    : 'http://localhost:3000/api';
  res.send(`window.API_URL = "${apiUrl}";`);
});

// 2. API 라우트 설정
app.use('/api/users', require(path.join(__dirname, 'users')));
app.use('/api/game', require(path.join(__dirname, 'game')));
app.use('/api/scores', require(path.join(__dirname, 'scores')));

// 관리자 페이지 라우트. 정적 파일 및 SPA 폴백보다 먼저 위치해야 합니다.
app.get('/admin', (req, res) => {
    res.sendFile(path.join(frontendPath, 'admin.html'));
});

//! ============================================================
//! 동적 설정 제공
//! ============================================================

// 3. 정적 파일 제공 (HTML, CSS, 클라이언트 JS 등)
// __dirname은 현재 파일(server.js)이 있는 'backend' 폴더를 가리킵니다.
// 따라서 상위 폴더로 이동한 후 'frontend' 폴더를 지정합니다.
app.use(express.static(frontendPath));

// 4. SPA Fallback 라우트
// 위에서 처리되지 않은 모든 GET 요청은 React, Vue 등 SPA의 진입점인 index.html로 보냅니다.
// 이를 통해 클라이언트 사이드 라우팅이 가능해지고, 페이지 새로고침 시 404 오류를 방지합니다.
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));