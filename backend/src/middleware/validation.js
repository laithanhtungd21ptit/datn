import Joi from 'joi';

// Validation schemas
export const schemas = {
  // User validation
  userCreate: Joi.object({
    username: Joi.string().min(3).max(50).required(),
    fullName: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    role: Joi.string().valid('admin', 'teacher', 'student').required(),
    password: Joi.string().min(6).max(100).required(),
    phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).allow(''),
    department: Joi.string().max(100).allow('')
  }),

  userUpdate: Joi.object({
    fullName: Joi.string().min(2).max(100),
    email: Joi.string().email(),
    role: Joi.string().valid('admin', 'teacher', 'student'),
    status: Joi.string().valid('active', 'inactive', 'locked'),
    phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).allow(''),
    department: Joi.string().max(100).allow('')
  }),

  // Class validation
  classCreate: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    code: Joi.string().min(1).max(20).required(),
    teacherId: Joi.string().hex().length(24).required(),
    department: Joi.string().max(100).allow(''),
    description: Joi.string().max(1000).allow('')
  }),

  classUpdate: Joi.object({
    name: Joi.string().min(1).max(200),
    code: Joi.string().min(1).max(20),
    teacherId: Joi.string().hex().length(24),
    department: Joi.string().max(100).allow(''),
    description: Joi.string().max(1000).allow('')
  }),

  // Assignment validation
  assignmentCreate: Joi.object({
    classId: Joi.string().hex().length(24).required(),
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(2000).allow(''),
    dueDate: Joi.date().greater('now').required(),
    isExam: Joi.boolean(),
    durationMinutes: Joi.number().integer().min(0).max(480).allow(null)
  }),

  assignmentUpdate: Joi.object({
    title: Joi.string().min(1).max(200),
    description: Joi.string().max(2000).allow(''),
    dueDate: Joi.date().greater('now'),
    isExam: Joi.boolean(),
    durationMinutes: Joi.number().integer().min(0).max(480).allow(null)
  }),

  // Submission validation
  submissionCreate: Joi.object({
    assignmentId: Joi.string().hex().length(24).required(),
    notes: Joi.string().max(1000).allow('')
  }),

  // Enrollment validation
  enrollmentCreate: Joi.object({
    classId: Joi.string().hex().length(24).required(),
    studentId: Joi.string().hex().length(24).required(),
    status: Joi.string().valid('enrolled', 'dropped', 'completed')
  }),

  // Comment validation
  commentCreate: Joi.object({
    content: Joi.string().min(1).max(1000).required()
  }),

  // Notification validation
  notificationSend: Joi.object({
    recipientId: Joi.string().hex().length(24).required(),
    title: Joi.string().min(1).max(200).required(),
    content: Joi.string().min(1).max(1000).required(),
    type: Joi.string().valid('general', 'assignment', 'grade', 'system')
  }),

  // Message validation
  messageSend: Joi.object({
    conversationId: Joi.string().hex().length(24).required(),
    content: Joi.string().min(1).max(2000).required()
  }),

  conversationCreate: Joi.object({
    type: Joi.string().valid('direct', 'group', 'class').required(),
    participantIds: Joi.array().items(Joi.string().hex().length(24)),
    classId: Joi.string().hex().length(24).when('type', { is: 'class', then: Joi.required() }),
    name: Joi.string().max(100).allow('')
  }),

  // Password validation
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(100).required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).max(100).required()
  }),

  // Login validation
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  }),

  // Profile update
  profileUpdate: Joi.object({
    fullName: Joi.string().min(2).max(100),
    phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).allow(''),
    department: Joi.string().max(100).allow(''),
    address: Joi.string().max(500).allow(''),
    dateOfBirth: Joi.date().iso(),
    gender: Joi.string().valid('Nam', 'Nữ', 'Khác')
  })
};

// Validation middleware
export const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json({ error: `Validation schema '${schemaName}' not found` });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: errors
      });
    }

    req.body = value; // Use validated/sanitized data
    next();
  };
};

// File upload validation
export const validateFileUpload = (allowedTypes = [], maxSize = 50 * 1024 * 1024, maxFiles = 5) => {
  return (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return next(); // No files to validate
    }

    // Check file count
    if (req.files.length > maxFiles) {
      return res.status(400).json({
        error: 'TOO_MANY_FILES',
        message: `Maximum ${maxFiles} files allowed`
      });
    }

    // Check each file
    for (const file of req.files) {
      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          error: 'FILE_TOO_LARGE',
          message: `File ${file.originalname} exceeds maximum size of ${maxSize / (1024 * 1024)}MB`
        });
      }

      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'INVALID_FILE_TYPE',
          message: `File type ${file.mimetype} not allowed for ${file.originalname}`
        });
      }
    }

    next();
  };
};
