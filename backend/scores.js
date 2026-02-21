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
        // Aggregation pipeline to get top scores and join with user and game data
        const topScores = await Score.aggregate([
            // 1. Sort by score and limit to top 20
            { $sort: { score: -1 } },
            { $limit: 20 },
            // 2. Join with 'users' collection to get country
            {
                $lookup: {
                    from: 'users', // The collection name for the User model
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            // 3. Join with 'games' collection to get live game state
            {
                $lookup: {
                    from: 'gamestates', // The collection name for the GameState model
                    localField: 'user', // field from the input documents (scores)
                    foreignField: 'user',
                    as: 'gameDetails'
                }
            },
            // 4. Reshape the documents for the final output
            {
                $project: {
                    username: 1,
                    score: 1,
                    date: 1,
                    country: { $arrayElemAt: ['$userDetails.country', 0] },
                    gameState: { $arrayElemAt: ['$gameDetails.gameState', 0] }
                }
            }
        ]);

        // 클라이언트에 보낼 데이터를 형식에 맞게 가공합니다.
        const formattedScores = topScores.map(score => ({
            username: score.username,
            score: score.score,
            date: score.date,
            country: score.country,
            // Check if game state exists and player is alive to determine liveFloor
            liveFloor: (score.gameState && score.gameState.player && score.gameState.player.hp > 0)
                ? score.gameState.floor
                : 0
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