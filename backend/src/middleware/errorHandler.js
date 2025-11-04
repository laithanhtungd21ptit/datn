// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files. Maximum 5 files allowed.' });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: 'Validation error: ' + errors.join(', ') });
  }

  // Cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: `${field} already exists` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({ error: message });
};
