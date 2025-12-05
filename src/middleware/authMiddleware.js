const { localDatabase } = require('../lib/localDatabase');

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const session = await localDatabase.getSessionByToken(token);
    if (session) {
      req.user = await localDatabase.getUserByUsername(session.username);
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to authenticate' });
  }
};

module.exports = authMiddleware;
