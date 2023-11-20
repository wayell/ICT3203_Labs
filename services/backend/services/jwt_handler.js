const jwt = require('jsonwebtoken')
const crypto = require('crypto');

// Function to generate a new JWT token
const generateToken = (payload) => {
  const encryptedPayload = encryptJwtPayload(payload)
  return jwt.sign({data: encryptedPayload}, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
}

// Function to verify a JWT token and return the decoded payload
const verifyToken = (token) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET)
    const decryptedPayload = decryptJwtPayload(payload.data)

    return decryptedPayload // returns the payload of the decoded token if verification is successful
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      // Handle the token expiration error here
      console.error("Token has expired")
      return 0
    } else {
      // Handle other errors here (e.g., token invalid, signature does not match, etc.)
      console.error("Token verification failed: ", error)
      return 1
    }
  }
}

const encryptJwtPayload = (payload) => {
  const iv = crypto.randomBytes(16); // Generate a random IV
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(process.env.JWT_PAYLOAD_SECRET), iv);
  let encrypted = cipher.update(JSON.stringify(payload));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

const decryptJwtPayload = (payload) => {
  let textParts = payload.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(process.env.JWT_PAYLOAD_SECRET), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return JSON.parse(decrypted.toString());
}

module.exports = {
  generateToken,
  verifyToken,
  decryptJwtPayload
}