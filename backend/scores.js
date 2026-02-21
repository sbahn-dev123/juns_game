const express = require('express');
const router = express.Router();
const auth = require('./auth');

// Score Model
const Score = require('./Score');

// @route   GET api/scores
// @desc    Get top scores
// @access  Public
router.get('/', async (req, res) => {
    try {
        // 상위 20개의 점수를 찾고, 'user' 필드를 통해 'country' 정보를 함께 가져옵니다.
        const topScores = await Score.find()
            .sort({ score: -1 })
            .limit(20)
            .populate('user', 'country'); // 'user'는 Score 모델의 필드, 'country'는 가져올 User 모델의 필드입니다.

        // 클라이언트에 보낼 데이터를 형식에 맞게 가공합니다.
        const formattedScores = topScores.map(score => ({
            username: score.username,
            score: score.score,
            // 사용자가 삭제되었을 경우를 대비하여 예외 처리
            country: score.user ? score.user.country : null,
        }));

        res.json(formattedScores);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/scores
// @desc    Add a new score
// @access  Private
router.post('/', auth, async (req, res) => {
    const { score } = req.body;

    try {
        const userScore = await Score.findOne({ user: req.user.id });

        if (userScore) {
            // Update score if new score is higher
            if (score > userScore.score) {
                userScore.score = score;
                userScore.date = Date.now();
                await userScore.save();
                res.json(userScore);
            } else {
                res.json({ message: '기존 점수보다 높지 않아 갱신되지 않았습니다.' });
            }
        } else {
            // Create new score
            const newScore = new Score({
                user: req.user.id,
                username: req.user.username,
                score
            });
            const savedScore = await newScore.save();
            res.json(savedScore);
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;