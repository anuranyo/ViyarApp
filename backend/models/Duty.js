const mongoose = require('mongoose');

const DutySchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: mongoose.Schema.Types.ObjectId, ref: 'Date', required: true },
    isOnDuty: { type: Boolean, required: true },
}, { 
    timestamps: true 
});

DutySchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Duty', DutySchema);
