const jwt = require('jsonwebtoken');
const db = require('./db');

const SECRET_KEY = 'seat-mat-platform-secret-key-2024';

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await db.get('SELECT id, username, name, role FROM users WHERE id = ?', [decoded.userId]);
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户不存在' });
    }
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ code: 401, message: '登录凭证无效' });
  }
}

function roleMiddleware(...roles) {
  return function (req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, message: '权限不足' });
    }
    next();
  };
}

function generateToken(userId) {
  return jwt.sign({ userId }, SECRET_KEY, { expiresIn: '7d' });
}

module.exports = { authMiddleware, roleMiddleware, generateToken, SECRET_KEY };
