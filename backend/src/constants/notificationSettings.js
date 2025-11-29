export const DEFAULT_NOTIFICATION_SETTINGS = {
  emailNotifications: true,
  smsNotifications: false,
  assignmentDeadlines: true,
  gradeUpdates: true,
  classAnnouncements: true,
  systemUpdates: true,
};

export const NOTIFICATION_TYPE_PREFERENCE = {
  assignment_created: 'assignmentDeadlines',
  assignment_graded: 'gradeUpdates',
  document_uploaded: 'classAnnouncements',
  announcement_created: 'classAnnouncements',
  comment_created: 'classAnnouncements',
  admin_notification: 'systemUpdates',
};

export const NOTIFICATION_SETTING_KEYS = Object.keys(DEFAULT_NOTIFICATION_SETTINGS);

export function normalizeNotificationSettings(settings = {}) {
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(settings || {}),
  };
}

export function shouldDeliverNotification(settings = {}, type) {
  const normalized = normalizeNotificationSettings(settings);
  if (normalized.emailNotifications === false) return false;
  const prefKey = NOTIFICATION_TYPE_PREFERENCE[type];
  if (!prefKey) return true;
  return normalized[prefKey] !== false;
}

