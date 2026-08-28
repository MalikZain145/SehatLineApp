// Restricts a route to one or more roles.
// Usage: router.get('/admin', authGuard, allowRoles('admin'), handler)

module.exports = function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource.',
      });
    }
    next();
  };
};
