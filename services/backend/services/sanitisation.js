const { body, query, validationResult } = require('express-validator')

// Middleware to validate and sanitize body and query parameters
const sanitiseInputs = [
  // Sanitize query parameters
  query('*').escape().trim(),

  // Sanitize body fields
  body('*').escape().trim(),

  // Check for NoSQL injection patterns in both body and query
  (req, res, next) => {
    const checkForNoSQLInjection = (obj) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key]
          // Check if the key or value is a MongoDB operator
          if (key.startsWith('$') || (typeof value === 'object' && 
          value !== null && !Array.isArray(value) && checkForNoSQLInjection(value))) {
            return true // Injection pattern found
          }
        }
      }
      return false // No injection pattern found
    }

    // Check for NoSQL injection patterns in the request body
    if (typeof req.body === 'object' && req.body !== null && checkForNoSQLInjection(req.body)) {
      return res.status(400).json({ error: 'NoSQL injection attempt detected in request body.' })
    }

    // Check for NoSQL injection patterns in the request query
    if (typeof req.query === 'object' && req.query !== null && checkForNoSQLInjection(req.query)) {
      return res.status(400).json({ error: 'NoSQL injection attempt detected in request query.' })
    }

    // If no NoSQL injection patterns are detected, move to the next middleware
    next()
  },

  // After all sanitization, check for validation results
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
]

module.exports = sanitiseInputs
