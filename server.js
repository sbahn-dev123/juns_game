require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('./User');

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

// API 라우트 설정
app.use('/api/users', require('./users'));
app.use('/api/game', require('./game'));
app.use('/api/scores', require('./scores'));

//! ============================================================
//! 동적 설정 제공
//! ============================================================
// 클라이언트(브라우저)에 현재 환경(개발/프로덕션)에 맞는 API URL을 제공하는 엔드포인트.
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  
  // .env 파일의 NODE_ENV 값에 따라 API URL을 동적으로 설정합니다.
  const isProduction = process.env.NODE_ENV === 'production';
  const apiUrl = isProduction 
    ? (process.env.PROD_API_URL || 'http://35.199.151.16//api') // 프로덕션 환경일 경우 .env의 PROD_API_URL 사용
    : 'http://localhost:3000/api'; // 개발 환경일 경우 localhost 사용

  // 클라이언트에서 사용할 API_URL을 전역 변수로 설정하는 스크립트를 응답으로 보냅니다.
  res.send(`window.API_URL = "${apiUrl}";`);
});

// 정적 파일 제공 (HTML, CSS, 클라이언트 JS)
app.use(express.static(path.join(__dirname, '')));

// 관리자 페이지 라우트
app.get('/admin', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'admin.html'));
});

// 그 외 모든 GET 요청에 대해 index.html을 제공 (Single Page Application)
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));