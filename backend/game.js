const express = require('express');
const router = express.Router();
const auth = require('./auth');

// GameState Model
const GameState = require('./GameState');

// @route   POST api/game/save
// @desc    Save game state
// @access  Private
router.post('/save', auth, async (req, res) => {
    try {
        const gameStateData = req.body;
        
        let gameState = await GameState.findOne({ user: req.user.id });

        if (gameState) {
            // Update existing game state
            gameState.gameState = gameStateData;
            gameState.last_saved = Date.now();
            await gameState.save();
        } else {
            // Create new game state
            gameState = new GameState({
                user: req.user.id,
                gameState: gameStateData
            });
            await gameState.save();
        }
        res.json({ message: '게임이 저장되었습니다.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/game/load
// @desc    Load game state
// @access  Private
router.get('/load', auth, async (req, res) => {
    try {
        const gameState = await GameState.findOne({ user: req.user.id });
        if (!gameState) {
            return res.status(404).json({ message: '저장된 게임이 없습니다.' });
        }
        res.json(gameState.gameState);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;