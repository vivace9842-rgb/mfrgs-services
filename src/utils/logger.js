const fs = require('fs')
const path = require('path')

const logDir = path.join(__dirname, '../../logs')

// Garante que a pasta logs exista
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir)
}

function writeLog(type, message) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${type}] ${message}\n`

  // Salva no arquivo
  fs.appendFileSync(path.join(logDir, 'system.log'), logMessage)

  // Mostra no console também
  console.log(logMessage)
}

module.exports = {
  info(msg) {
    writeLog('INFO', msg)
  },

  warn(msg) {
    writeLog('WARN', msg)
  },

  error(msg) {
    writeLog('ERROR', msg)
  },

  stripe(msg) {
    writeLog('STRIPE', msg)
  }
}
