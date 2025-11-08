import { UserActivityModel } from '../models/UserActivity.js';
import { SystemLogModel } from '../models/SystemLog.js';

// Log user activity
export async function logUserActivity(userId, role, actionType, targetEntityId = null, targetEntityType = null, description = '', metadata = {}, req = null) {
  try {
    const activityData = {
      userId,
      role,
      actionType,
      targetEntityId,
      targetEntityType,
      description,
      metadata,
    };

    if (req) {
      activityData.ipAddress = req.ip || req.connection.remoteAddress || '';
      activityData.userAgent = req.get('User-Agent') || '';
    }

    await UserActivityModel.create(activityData);
  } catch (error) {
    console.error('Failed to log user activity:', error);
  }
}

// Log system event
export async function logSystemEvent(level, message, source = 'server', stackTrace = '', metadata = {}, req = null) {
  try {
    const logData = {
      level,
      message,
      source,
      stackTrace,
      metadata,
    };

    if (req) {
      logData.requestId = req.requestId || '';
      logData.userId = req.user ? req.user.id : null;
      logData.ipAddress = req.ip || req.connection.remoteAddress || '';
      logData.endpoint = req.originalUrl || '';
    }

    await SystemLogModel.create(logData);
  } catch (error) {
    console.error('Failed to log system event:', error);
  }
}

// Get recent user activities
export async function getRecentUserActivities(limit = 50, page = 1, pageSize = null) {
  try {
    const skip = pageSize ? (page - 1) * pageSize : 0;
    const actualLimit = pageSize || limit;

    const activities = await UserActivityModel.find({})
      .populate('userId', 'username fullName role studentId teacherId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(actualLimit)
      .lean();

    const total = await UserActivityModel.countDocuments();

    return {
      items: activities,
      total,
      page: pageSize ? page : 1,
      pageSize: actualLimit,
      totalPages: pageSize ? Math.ceil(total / pageSize) : 1
    };
  } catch (error) {
    console.error('Failed to get user activities:', error);
    return { items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };
  }
}

// Get system logs
export async function getSystemLogs(level = null, limit = 100) {
  try {
    const query = level ? { level } : {};
    return await SystemLogModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('Failed to get system logs:', error);
    return [];
  }
}
