const mongoose = require('mongoose')

const LogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    description: { type: String },
    key: { type: String, required: true },
    dateTime: { type: Date, required: true }
})

const Log = mongoose.model('Log', LogSchema, 'logs')

module.exports = { LogSchema, Log }
