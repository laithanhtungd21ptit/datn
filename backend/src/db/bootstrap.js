import { UserModel } from '../models/User.js';
import { ClassModel } from '../models/Class.js';
import { AssignmentModel } from '../models/Assignment.js';
import { EnrollmentModel } from '../models/Enrollment.js';
import { SubmissionModel } from '../models/Submission.js';
import { DocumentModel } from '../models/Document.js';
import { AnnouncementModel } from '../models/Announcement.js';
import { CommentModel } from '../models/Comment.js';
import { ConversationModel } from '../models/Conversation.js';
import { MessageModel } from '../models/Message.js';

export async function bootstrapIndexes() {
  // Ensure indexes/collections are created up-front
  await Promise.all([
    UserModel.init(),
    ClassModel.init(),
    AssignmentModel.init(),
    EnrollmentModel.init(),
    SubmissionModel.init(),
    DocumentModel.init(),
    AnnouncementModel.init(),
    CommentModel.init(),
    ConversationModel.init(),
    MessageModel.init(),
  ]);
}


