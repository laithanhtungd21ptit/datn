import mongoose from 'mongoose';

const MonitoringSettingsSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      unique: true,
      index: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    // Camera & Audio requirements
    requireCamera: {
      type: Boolean,
      default: true
    },
    requireMicrophone: {
      type: Boolean,
      default: false
    },
    requireFullScreen: {
      type: Boolean,
      default: true
    },
    // AI Detection settings
    detectFaceTracking: {
      type: Boolean,
      default: true
    },
    detectMultipleFaces: {
      type: Boolean,
      default: true
    },
    detectLookingAway: {
      type: Boolean,
      default: true
    },
    detectPhoneUsage: {
      type: Boolean,
      default: true
    },
    // Browser behavior detection
    detectTabSwitch: {
      type: Boolean,
      default: true
    },
    detectCopyPaste: {
      type: Boolean,
      default: true
    },
    detectRightClick: {
      type: Boolean,
      default: true
    },
    detectDevTools: {
      type: Boolean,
      default: true
    },
    // Violation thresholds
    maxViolationsBeforeWarning: {
      type: Number,
      default: 3
    },
    maxViolationsBeforeTerminate: {
      type: Number,
      default: 10
    },
    // Sensitivity settings
    sensitivity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    // Recording settings
    recordSession: {
      type: Boolean,
      default: false
    },
    recordAudio: {
      type: Boolean,
      default: false
    },
    captureScreenshots: {
      type: Boolean,
      default: false
    },
    screenshotInterval: {
      type: Number,
      default: 30 // seconds
    },
    // Notification settings
    notifyTeacherOnViolation: {
      type: Boolean,
      default: true
    },
    notifyTeacherOnHighSeverity: {
      type: Boolean,
      default: true
    },
    sendEmailAlerts: {
      type: Boolean,
      default: false
    },
    // Additional settings
    allowedTabSwitches: {
      type: Number,
      default: 2 // số lần chuyển tab được phép
    },
    heartbeatInterval: {
      type: Number,
      default: 5 // seconds
    },
    inactivityTimeout: {
      type: Number,
      default: 300 // seconds (5 phút)
    },
    // Custom rules
    customRules: [{
      name: String,
      description: String,
      enabled: Boolean
    }]
  },
  { timestamps: true }
);

// Static method to get or create default settings
MonitoringSettingsSchema.statics.getOrCreateDefault = async function(assignmentId) {
  let settings = await this.findOne({ assignmentId });
  
  if (!settings) {
    settings = await this.create({
      assignmentId,
      // Use default values from schema
    });
  }
  
  return settings;
};

// Method to update settings
MonitoringSettingsSchema.methods.updateSettings = function(updates) {
  Object.assign(this, updates);
  return this.save();
};

export const MonitoringSettingsModel = mongoose.models.MonitoringSettings || mongoose.model('MonitoringSettings', MonitoringSettingsSchema);

