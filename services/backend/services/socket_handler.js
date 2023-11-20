let io

const init = (httpServer, corsOptions) => {
    io = require('socket.io')(httpServer, {
        cors: corsOptions
    })

    io.on('connection', (socket) => {
        console.log('New client connected')

        // Getting the client IP address
        const clientIpAddress = socket.handshake.address ||
            (socket.request.headers['x-forwarded-for'] && socket.request.headers['x-forwarded-for'].split(/\s*,\s*/)[0]);
        console.log(`Client IP address: ${clientIpAddress}`)

        socket.on('disconnect', () => {
            console.log('Client disconnected')
        })

        socket.on('verify-email', (data) => {
            console.log("verify-email socket on")
            const { email } = data
            socket.join(email)
        })

        socket.on('verify-forget-password-email', (data) => {
            console.log("verify-forget-password-email socket on")
            const { email } = data
            socket.join(`forget-password-${email}`)
        })
    })
}

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!')
    }
    return io
}

module.exports = { init, getIo }
