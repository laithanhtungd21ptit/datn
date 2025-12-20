import mongoose from 'mongoose';

const ViolationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'face_not_detected',
      'multiple_faces',
      'multiple_people_detected',
      'looking_away',
      'tab_switch',
      'tab_hidden',
      'fullscreen_exit',
      'phone_detected',
      'right_click',
      'keyboard_shortcut',
      'devtools_attempt',
      'copy_detected',
      'cut_detected',
      'paste_detected',
      'object_detected'
    ],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  evidence: {
    type: mongoose.Schema.Types.Mixed,
    default: '' // Screenshot URL or video timestamp or Object data
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: null // Additional details for object detection
  },
  description: {
    type: String,
    required: true
  }
}, { _id: true });

const ExamSessionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    endedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'terminated', 'abandoned'],
      default: 'in_progress',
      index: true
    },
    violations: [ViolationSchema],
    totalViolations: {
      type: Number,
      default: 0
    },
    videoRecordingUrl: {
      type: String,
      default: ''
    },
    browserLogs: [{
      type: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    monitoringEnabled: {
      type: Boolean,
      default: true
    },
    autoTerminated: {
      type: Boolean,
      default: false
    },
    terminationReason: {
      type: String,
      default: ''
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now
    },
    deviceInfo: {
      userAgent: String,
      browser: String,
      os: String,
      screenResolution: String
    },
    isSubmitted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
ExamSessionSchema.index({ assignmentId: 1, studentId: 1 });
ExamSessionSchema.index({ status: 1, startedAt: -1 });
ExamSessionSchema.index({ assignmentId: 1, status: 1 });
ExamSessionSchema.index({ assignmentId: 1, isSubmitted: 1 });

// Virtual for duration
ExamSessionSchema.virtual('durationMinutes').get(function() {
  if (!this.endedAt) return null;
  return Math.round((this.endedAt - this.startedAt) / (1000 * 60));
});

// Virtual for high severity violations count (kept for backward compatibility, always returns 0)
ExamSessionSchema.virtual('highSeverityViolations').get(function() {
  return 0; // Severity no longer used
});

// Method to add violation
ExamSessionSchema.methods.addViolation = function(violation) {
  this.violations.push(violation);
  this.totalViolations = this.violations.length;
  return this.save();
};

// Method to update heartbeat
ExamSessionSchema.methods.updateHeartbeat = function() {
  this.lastHeartbeat = new Date();
  return this.save();
};

// Method to end session
ExamSessionSchema.methods.endSession = function(reason = 'completed') {
  this.endedAt = new Date();
  
  // Map reason to status
  if (reason === 'terminated') {
    this.status = 'terminated';
    this.autoTerminated = true;
    this.terminationReason = reason;
  } else if (reason === 'exited' || reason === 'abandoned') {
    this.status = 'completed'; // Completed với lý do exited
    this.terminationReason = reason === 'exited' ? 'Student exited exam' : 'Session abandoned';
  } else {
    // 'completed' hoặc các reason khác
    this.status = 'completed';
  }
  
  return this.save();
};

export const ExamSessionModel = mongoose.models.ExamSession || mongoose.model('ExamSession', ExamSessionSchema);

