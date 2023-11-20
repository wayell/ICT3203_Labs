const jwt = require('jsonwebtoken')

const { User } = require('../models/model_user')

const { verifyToken } = require('../services/jwt_handler')

const jwtValidationMiddleware = async (req, res, next) => {
  const token = req.cookies.jwtToken

  try {
    // Validate the token
    const payload = verifyToken(token)

    if (payload == 0 || payload == 1) {
      res.clearCookie('jwtToken', {
        expires: new Date(0)
      })
      return res.status(401).json({ message: 'Token expired or not valid' })
    }

    req.user = payload

    // Fetch the user from the database
    const user = await User.findOne({ _id: payload.sub })
    if (!user) {
      res.clearCookie('jwtToken', {
        expires: new Date(0)
      })
      return res.status(401).json({ message: 'User not found' })
    }

    // if freeze status is true and expiration has not past
    if (user.freezeStatus && user.freezeExpiration >= new Date()) {
      res.clearCookie('jwtToken', {
        expires: new Date(0)
      })
      return res.status(401).json({ message: `User's account is frozen` })
    }

    // Compare the JWT token from the request with the token in the database
    if (token !== user.jwt) {
      res.clearCookie('jwtToken', {
        expires: new Date(0)
      })
      return res.status(401).json({ message: 'Session expired. Please log in again' })
    }

    // Proceed to the next middleware or route handler
    next()

  } catch (error) {
    res.clearCookie('jwtToken', {
      expires: new Date(0)
    })

    // Handle token validation errors, like token expiration or signature mismatch
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' })
    }

    return res.status(401).json({ message: 'Invalid token' })
  }
}

module.exports = jwtValidationMiddleware