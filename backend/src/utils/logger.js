const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.colorize(),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`)
  ),
  transports: [
    new transports.Console(),
    // In production you'd add: new transports.File({ filename: 'error.log', level: 'error' })
  ],
});

module.exports = logger;
