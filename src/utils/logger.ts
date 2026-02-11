import winston from 'winston';
import path from 'path';

// Rotate log files: 1000 lines per file
const MAX_LINES_PER_FILE = 1000;
let currentLineCount = 0;
let currentFileIndex = 0;

const getLogFileName = () => {
  const timestamp = new Date().toISOString().split('T')[0];
  return path.join('logs', `bot-${timestamp}-${currentFileIndex}.log`);
};

// Custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    currentLineCount++;
    
    // Rotate file if needed
    if (currentLineCount >= MAX_LINES_PER_FILE) {
      currentLineCount = 0;
      currentFileIndex++;
    }
    
    const log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    return stack ? `${log}\n${stack}` : log;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),
    // File output
    new winston.transports.File({
      filename: getLogFileName(),
      maxsize: 5242880, // 5MB backup
    })
  ]
});

export default logger;
