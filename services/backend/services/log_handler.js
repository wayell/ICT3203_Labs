// const winston = require('winston');

// const logger = winston.createLogger({
//   transports: [
//     new winston.transports.Http({
//       host: '13.250.2.20',
//       port: 8888,
//       path: '/log'
//     })
//   ]
// });

// logger.info('This will be sent to the EC2 instance');

const fs = require('fs');
const path = require('path');

const addLog = async (log) => {
    try {
        // const logFilePath = '../logs.log'

        const logFilePath = path.join(__dirname, '../logs.log');

        fs.appendFileSync(logFilePath, log + '\n');
        console.log("Added a log to log file")
    } catch (error) {
        console.error(error)
    }
}

module.exports = { addLog }