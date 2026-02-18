const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// User Model
const User = require('./User');

// @route   POST api/users/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Simple validation
    if (!username || !password) {
        return res.status(400).json({ message: '모든 필드를 채워주세요.' });
    }

    try {
        // Check for existing user
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: '이미 존재하는 사용자 이름입니다.' });
        }

        user = new User({
            username,
            password
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

module.exports = router;