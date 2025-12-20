import jwt from 'jsonwebtoken';

function extractToken(req) {
  const authHeader = req.headers?.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  // Fallback: try cookie named accessToken if later we enable cookies
  const cookie = req.headers?.cookie || '';
  const match = cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function authRequired(allowedRoles = []) {
  return (req, res, next) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' });
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      req.user = { id: payload.sub, role: payload.role, username: payload.username };
      if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({ error: 'FORBIDDEN' });
        }
      }
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
  };
}


