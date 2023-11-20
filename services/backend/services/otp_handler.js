const speakeasy = require('speakeasy')

const generateSecret = () => {
    return speakeasy.generateSecret({ length: 20 }).base32
}

const generateOtp = (secret) => {
    return speakeasy.totp({
        secret: secret,
        encoding: 'base32',
        step: 30
    })
}

const verifyOtp = (enteredOtp, secret) => {
    console.log(`User Input OTP: ${enteredOtp}`)
    // console.log(`Actual OTP Now: ${generateOtp(secret)}`)
    // console.log(`Note: prev OTP of 60s ago will also be approved.`)

    return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: enteredOtp,
        window: 2
    })
}

module.exports = { generateSecret, generateOtp, verifyOtp }