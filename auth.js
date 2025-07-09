const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class TelegramAuthService {
  constructor(botToken, jwtSecret) {
    this.botToken = botToken;
    this.jwtSecret = jwtSecret;
  }

  verifyTelegramAuth(authData) {
    const data = { ...authData };
    const receivedHash = data.hash;
    delete data.hash;

    if (!receivedHash) {
      return false;
    }

    // Create verification string from sorted auth data
    const authDataItems = [];
    for (const key of Object.keys(data).sort()) {
      if (data[key] !== null && data[key] !== undefined) {
        authDataItems.push(`${key}=${data[key]}`);
      }
    }

    const dataCheckString = authDataItems.join('\n');

    // Calculate expected hash
    const secretKey = crypto.createHash('sha256').update(this.botToken).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(receivedHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  }

  createUserToken(user) {
    const payload = {
      user_id: user.telegram_id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      photo_url: user.photo_url,
      type: 'user'
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  extractTokenFromSocket(socket) {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    return this.verifyToken(token);
  }
}

module.exports = TelegramAuthService;