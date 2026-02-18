const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GameStateSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    gameState: {
        type: Schema.Types.Mixed,
        required: true
    },
    last_saved: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('gamestate', GameStateSchema);