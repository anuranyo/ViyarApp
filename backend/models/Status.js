const mongoose = require('mongoose');

const StatusSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    description: { type: String, required: true },
});

module.exports = mongoose.model('Status', StatusSchema);
