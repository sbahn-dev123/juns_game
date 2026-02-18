const express = require('express');
const router = express.Router();
const auth = require('./auth');

// Score Model
const Score = require('./Score');

// @route   GET api/scores
// @desc    Get all scores
// @access  Public
router.get('/', async (req, res) => {
    try {
        const scores = await Score.find().sort({ score: -1 }).limit(10);
        res.json(scores);
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