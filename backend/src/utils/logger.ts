import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'proofmeet-api' },
  transports: [
    // Always log to console (Railway/Docker needs this)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Also log to files for local development
    new winston.transports.File({ 
      filename: process.env.LOG_FILE_PATH || './logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: process.env.LOG_FILE_PATH || './logs/combined.log' 
    }),
  ],
});
