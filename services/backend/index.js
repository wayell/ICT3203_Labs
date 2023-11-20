const express = require("express")
const cors = require('cors')
const mongoose = require('mongoose')
const http = require('http')  // Import the http module
const cookieParser = require('cookie-parser')
const helmet = require('helmet')

const socketHandler = require('./services/socket_handler')
const sanitiseInputs = require('./services/sanitisation')

require('dotenv').config()

const app = express()
const PORT = process.env.PORT

app.use(cookieParser())
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}))
app.use(express.json())

app.use(sanitiseInputs)

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"]
  }
}))

mongoose.connect(process.env.MONGODB_CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true })

const connection = mongoose.connection
connection.once('open', () => {
  console.log("MongoDB database connection established successfully")
})

const userRoutes = require('./routes/users')
const bankAccountRoutes = require('./routes/bankaccounts')
const transactionRoutes = require('./routes/transactions')

app.use('/api/users', userRoutes)
app.use('/api/bankaccounts', bankAccountRoutes)
app.use('/api/transactions', transactionRoutes) 

// http://localhost:8080/api
app.get('/api', (req, res) => {
  console.log("Server default endpoint working")
  let code = 200

  res.sendStatus(code)
})

// Create an HTTP server instance from the Express app
const server = http.createServer(app)

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST"],
  credentials: true
}

socketHandler.init(server, corsOptions)

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`)
})

module.exports = { app, server, connection }