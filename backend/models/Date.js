const mongoose = require('mongoose');

const DateSchema = new mongoose.Schema({
    date: { type: Date, required: true, unique: true },
});

module.exports = mongoose.model('Date', DateSchema);
