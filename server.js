require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// MongoDB 연결
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.log(err));

// API 라우트 설정
app.use('/api/users', require('./users'));
app.use('/api/game', require('./game'));
app.use('/api/scores', require('./scores'));

// 정적 파일 제공 (HTML, CSS, 클라이언트 JS)
app.use(express.static(path.join(__dirname, '')));

// 모든 GET 요청에 대해 index.html을 제공 (Single Page Application)
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));