const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    country: {
        type: String,
        required: true
    },
    birthdate: {
        type: Date,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    register_date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('user', UserSchema);