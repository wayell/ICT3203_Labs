const mongoose = require('mongoose')

const TokenSchema = new mongoose.Schema({
    email: { type: String, required: true },
    value: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now }
}) 

// Explicitly create the TTL 
TokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 })

const Token = mongoose.model('Token', TokenSchema, 'tokens')

module.exports = { TokenSchema, Token }
