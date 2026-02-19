const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const auth = require('./auth');
// User Model
const User = require('./User');

// @route   POST api/users/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
    const { username, password, email, country, birthdate } = req.body;

    // Simple validation
    if (!username || !password || !email || !country || !birthdate) {
        return res.status(400).json({ message: '모든 필드를 채워주세요.' });
    }

    // 생년월일 유효성 검사 추가
    if (isNaN(new Date(birthdate).getTime())) {
        return res.status(400).json({ message: '유효하지 않은 생년월일 형식입니다.' });
    }

    try {
        // Check for existing user
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: '이미 존재하는 사용자 이름입니다.' });
        }

        // Check for existing email
        user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
        }

        user = new User({
            username,
            password,
            email,
            country,
            birthdate
        });

        // Create salt & hash
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        res.json({
            message: '회원가입 성공!'
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/users/login
// @desc    Auth user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Simple validation
    if (!username || !password) {
        return res.status(400).json({ message: '모든 필드를 채워주세요.' });
    }

    try {
        // Check for existing user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.' });
        }

        const payload = {
            id: user.id,
            username: user.username
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' }, // 1 day
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    username: user.username
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   GET api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
    try {
        // .select('-password')를 사용하여 응답에서 비밀번호 필드를 제외합니다.
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
    const { email, country, birthdate, currentPassword } = req.body;

    // 유효성 검사
    if (!email || !country || !birthdate || !currentPassword) {
        return res.status(400).json({ message: '필수 필드를 모두 입력해주세요.' });
    }

    // 생년월일 유효성 검사 추가
    if (isNaN(new Date(birthdate).getTime())) {
        return res.status(400).json({ message: '유효하지 않은 생년월일 형식입니다.' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // 현재 비밀번호 확인
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: '현재 비밀번호가 일치하지 않습니다.' });
        }

        // 다른 사용자가 이미 사용 중인 이메일인지 확인
        if (email !== user.email) {
            const existingEmailUser = await User.findOne({ email });
            if (existingEmailUser) {
                return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
            }
        }

        // 필드 업데이트
        user.email = email;
        user.country = country;
        user.birthdate = birthdate;

        await user.save();

        res.json({ message: '프로필이 성공적으로 업데이트되었습니다.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;