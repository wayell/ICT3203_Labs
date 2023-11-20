const mongoose = require('mongoose')

const OtpSchema = new mongoose.Schema({
    email: { type: String },
    secret: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, required: true, default: Date.now } 
    // will be set to 100 years from now after user has verified otp
    // this will trick MongoDB to never expire the otp, which is what we want
}) 

// Explicitly create the TTL index
OtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 }) // 5 min expiry

const Otp = mongoose.model('Otp', OtpSchema, 'otps')

module.exports = { OtpSchema, Otp }
