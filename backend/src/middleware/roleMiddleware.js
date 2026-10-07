const requireRole = (role) => {
  return (req, res, next) => {
    // Check if user exists on request (requires authMiddleware to run first)
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Check role
    if (req.user.role !== role) {
      return res.status(403).json({ success: false, message: 'Access denied: Insufficient permissions' });
    }

    next();
  };
};

module.exports = requireRole;
