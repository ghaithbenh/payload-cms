import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino/file',
          options: { destination: 1 },
        },
      }
    : {
        formatters: {
          level(label) {
            return { level: label }
          },
        },
      }),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'secret'],
    censor: '[REDACTED]',
  },
})

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings)
}
