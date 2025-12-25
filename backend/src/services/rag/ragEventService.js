import EventEmitter from 'events';
import { ingestItemChunks } from './ingestHelpers.js';
import { deleteChunksBySource } from './vectorStore.js';

class RagEventService extends EventEmitter {
  constructor() {
    super();
    this.isProcessing = false;
    this.queue = [];
    this.setupListeners();
  }

  setupListeners() {
    // Listen to various document events
    this.on('document:created', (data) => this.handleDocumentCreated(data));
    this.on('document:updated', (data) => this.handleDocumentUpdated(data));
    this.on('document:deleted', (data) => this.handleDocumentDeleted(data));
    
    this.on('announcement:created', (data) => this.handleAnnouncementCreated(data));
    this.on('announcement:updated', (data) => this.handleAnnouncementUpdated(data));
    this.on('announcement:deleted', (data) => this.handleAnnouncementDeleted(data));
    
    this.on('assignment:created', (data) => this.handleAssignmentCreated(data));
    this.on('assignment:updated', (data) => this.handleAssignmentUpdated(data));
    this.on('assignment:deleted', (data) => this.handleAssignmentDeleted(data));
    
    this.on('class:created', (data) => this.handleClassCreated(data));
    this.on('class:updated', (data) => this.handleClassUpdated(data));
    this.on('class:deleted', (data) => this.handleClassDeleted(data));

    this.on('comment:created', (data) => this.handleCommentCreated(data));
    this.on('comment:deleted', (data) => this.handleCommentDeleted(data));
  }

  // Process queue with concurrency control
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        try {
          await task();
        } catch (err) {
          console.error('[RAG Queue] Task error:', err.message);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  addToQueue(task) {
    this.queue.push(task);
    // Process queue asynchronously (don't block)
    setImmediate(() => this.processQueue());
  }

  // ============ ANNOUNCEMENT HANDLERS ============
  async handleAnnouncementCreated(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Ingesting new announcement: ${data.item._id}`);
      
      const chunkTextFn = this.getAnnouncementChunkFn();
      const buildChunkDataFn = this.getAnnouncementChunkDataFn();
      
      await ingestItemChunks(data.item, 'announcement', chunkTextFn, buildChunkDataFn, true);
      console.log(`[RAG] ✓ Announcement ${data.item._id} ingested`);
    });
  }

  async handleAnnouncementUpdated(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Re-ingesting updated announcement: ${data.item._id}`);
      
      // Delete old chunks first
      await deleteChunksBySource(data.item._id);
      
      const chunkTextFn = this.getAnnouncementChunkFn();
      const buildChunkDataFn = this.getAnnouncementChunkDataFn();
      
      await ingestItemChunks(data.item, 'announcement', chunkTextFn, buildChunkDataFn, false);
      console.log(`[RAG] ✓ Announcement ${data.item._id} re-ingested`);
    });
  }

  async handleAnnouncementDeleted(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Deleting announcement chunks: ${data.id}`);
      await deleteChunksBySource(data.id);
      console.log(`[RAG] ✓ Announcement ${data.id} deleted from RAG`);
    });
  }

  // ============ ASSIGNMENT HANDLERS ============
  async handleAssignmentCreated(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Ingesting new assignment: ${data.item._id}`);
      
      const chunkTextFn = this.getAssignmentChunkFn();
      const buildChunkDataFn = this.getAssignmentChunkDataFn();
      
      await ingestItemChunks(data.item, 'assignment', chunkTextFn, buildChunkDataFn, true);
      console.log(`[RAG] ✓ Assignment ${data.item._id} ingested`);
    });
  }

  async handleAssignmentUpdated(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Re-ingesting updated assignment: ${data.item._id}`);
      
      await deleteChunksBySource(data.item._id);
      
      const chunkTextFn = this.getAssignmentChunkFn();
      const buildChunkDataFn = this.getAssignmentChunkDataFn();
      
      await ingestItemChunks(data.item, 'assignment', chunkTextFn, buildChunkDataFn, false);
      console.log(`[RAG] ✓ Assignment ${data.item._id} re-ingested`);
    });
  }

  async handleAssignmentDeleted(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Deleting assignment chunks: ${data.id}`);
      await deleteChunksBySource(data.id);
      console.log(`[RAG] ✓ Assignment ${data.id} deleted from RAG`);
    });
  }

  // ============ CLASS HANDLERS ============
  async handleClassCreated(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Ingesting new class: ${data.item._id}`);
      
      const chunkTextFn = this.getClassChunkFn();
      const buildChunkDataFn = this.getClassChunkDataFn();
      
      await ingestItemChunks(data.item, 'class', chunkTextFn, buildChunkDataFn, true);
      console.log(`[RAG] ✓ Class ${data.item._id} ingested`);
    });
  }

  async handleClassUpdated(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Re-ingesting updated class: ${data.item._id}`);
      
      await deleteChunksBySource(data.item._id);
      
      const chunkTextFn = this.getClassChunkFn();
      const buildChunkDataFn = this.getClassChunkDataFn();
      
      await ingestItemChunks(data.item, 'class', chunkTextFn, buildChunkDataFn, false);
      console.log(`[RAG] ✓ Class ${data.item._id} re-ingested`);
    });
  }

  async handleClassDeleted(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Deleting class chunks: ${data.id}`);
      await deleteChunksBySource(data.id);
      console.log(`[RAG] ✓ Class ${data.id} deleted from RAG`);
    });
  }

  // ============ COMMENT HANDLERS ============
  async handleCommentCreated(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Ingesting new comment: ${data.item._id}`);
      
      const chunkTextFn = this.getCommentChunkFn();
      const buildChunkDataFn = this.getCommentChunkDataFn();
      
      await ingestItemChunks(data.item, 'comment', chunkTextFn, buildChunkDataFn, true);
      console.log(`[RAG] ✓ Comment ${data.item._id} ingested`);
    });
  }

  async handleCommentDeleted(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Deleting comment chunks: ${data.id}`);
      await deleteChunksBySource(data.id);
      console.log(`[RAG] ✓ Comment ${data.id} deleted from RAG`);
    });
  }

  // ============ DOCUMENT HANDLERS ============
  async handleDocumentCreated(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Ingesting new document: ${data.item._id}`);
      
      const chunkTextFn = this.getDocumentChunkFn();
      const buildChunkDataFn = this.getDocumentChunkDataFn();
      
      await ingestItemChunks(data.item, 'document', chunkTextFn, buildChunkDataFn, true);
      console.log(`[RAG] ✓ Document ${data.item._id} ingested`);
    });
  }

  async handleDocumentUpdated(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Re-ingesting updated document: ${data.item._id}`);
      
      await deleteChunksBySource(data.item._id);
      
      const chunkTextFn = this.getDocumentChunkFn();
      const buildChunkDataFn = this.getDocumentChunkDataFn();
      
      await ingestItemChunks(data.item, 'document', chunkTextFn, buildChunkDataFn, false);
      console.log(`[RAG] ✓ Document ${data.item._id} re-ingested`);
    });
  }

  async handleDocumentDeleted(data) {
    this.addToQueue(async () => {
      console.log(`[RAG] Deleting document chunks: ${data.id}`);
      await deleteChunksBySource(data.id);
      console.log(`[RAG] ✓ Document ${data.id} deleted from RAG`);
    });
  }

  // ============ CHUNK FUNCTION DEFINITIONS ============
  chunkText(text, chunkSize = 1000, overlap = 150) {
    if (!text || !text.trim()) return [];
    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const slice = words.slice(i, i + chunkSize).join(' ');
      if (slice.trim()) chunks.push(slice.trim());
      if (i + chunkSize >= words.length) break;
    }
    return chunks.length > 0 ? chunks : [text.trim()];
  }

  formatDate(date) {
    if (!date) return '';
    try {
      return new Date(date).toLocaleString('vi-VN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return String(date);
    }
  }

  getAnnouncementChunkFn() {
    return (item) => {
      const parts = [
        `Thông báo: ${item.title}`,
        item.classId ? `Lớp: ${item.classId.name || ''} (Mã: ${item.classId.code || ''})` : '',
        `Loại: ${item.type || 'general'}`,
        item.content ? `Nội dung: ${item.content}` : '',
        `Ngày tạo: ${this.formatDate(item.createdAt)}`,
      ].filter(Boolean);
      return this.chunkText(parts.join('\n\n'));
    };
  }

  getAnnouncementChunkDataFn() {
    return (item, text, idx) => ({
      sourceId: item._id,
      chunkIndex: idx,
      text,
      title: item.title,
      classId: item.classId?._id || item.classId,
      rolesAllowed: ['student', 'teacher', 'admin'],
      metadata: { 
        type: item.type,
        className: item.classId?.name,
        classCode: item.classId?.code,
      },
    });
  }

  getAssignmentChunkFn() {
    return (item) => {
      const parts = [
        `Bài tập: ${item.title}`,
        item.classId ? `Lớp: ${item.classId.name || ''} (Mã: ${item.classId.code || ''})` : '',
        item.description ? `Mô tả: ${item.description}` : '',
        `Hạn nộp: ${this.formatDate(item.dueDate)}`,
        item.isExam ? `Đây là kỳ thi` : 'Đây là bài tập thường',
        item.isExam && item.durationMinutes ? `Thời gian làm bài: ${item.durationMinutes} phút` : '',
        item.isExam && item.startTime ? `Thời gian bắt đầu: ${this.formatDate(item.startTime)}` : '',
        item.isExam && item.endTime ? `Thời gian kết thúc: ${this.formatDate(item.endTime)}` : '',
        item.requireMonitoring ? 'Yêu cầu giám sát: Có' : 'Yêu cầu giám sát: Không',
        item.attachments?.length ? `Tệp đính kèm: ${item.attachments.join(', ')}` : '',
        `Ngày tạo: ${this.formatDate(item.createdAt)}`,
      ].filter(Boolean);
      return this.chunkText(parts.join('\n'));
    };
  }

  getAssignmentChunkDataFn() {
    return (item, text, idx) => ({
      sourceId: item._id,
      chunkIndex: idx,
      text,
      title: item.title,
      classId: item.classId?._id || item.classId,
      rolesAllowed: ['student', 'teacher', 'admin'],
      metadata: { 
        dueDate: item.dueDate, 
        isExam: item.isExam,
        durationMinutes: item.durationMinutes,
        startTime: item.startTime,
        endTime: item.endTime,
        requireMonitoring: item.requireMonitoring,
        attachments: item.attachments,
        classCode: item.classId?.code,
        className: item.classId?.name,
      },
    });
  }

  getClassChunkFn() {
    return (item) => {
      const parts = [
        `Lớp học: ${item.name}`,
        `Mã lớp: ${item.code || ''}`,
        item.description ? `Mô tả: ${item.description}` : '',
        item.department ? `Khoa: ${item.department}` : '',
        `Số tín chỉ: ${item.credits || 3}`,
        item.teacherId ? `Giảng viên: ${item.teacherId.fullName || ''}${item.teacherId.teacherId ? ` (Mã: ${item.teacherId.teacherId})` : ''}${item.teacherId.username ? ` - Tên đăng nhập: ${item.teacherId.username}` : ''}` : '',
        `Ngày tạo: ${this.formatDate(item.createdAt)}`,
      ].filter(Boolean);
      return this.chunkText(parts.join('\n'));
    };
  }

  getClassChunkDataFn() {
    return (item, text, idx) => ({
      sourceId: item._id,
      chunkIndex: idx,
      text,
      title: item.name,
      classId: item._id,
      rolesAllowed: ['student', 'teacher', 'admin'],
      metadata: { 
        code: item.code,
        department: item.department,
        credits: item.credits,
        teacherId: item.teacherId?._id,
        teacherName: item.teacherId?.fullName,
        teacherCode: item.teacherId?.teacherId,
      },
    });
  }

  getDocumentChunkFn() {
    return (item) => {
      const parts = [
        `Tài liệu: ${item.title}`,
        item.classId ? `Lớp: ${item.classId.name || ''} (Mã: ${item.classId.code || ''})` : '',
        item.teacherId ? `Giảng viên: ${item.teacherId.fullName || ''}` : '',
        item.description ? `Mô tả: ${item.description}` : '',
        item.fileName ? `Tên file: ${item.fileName}` : '',
        item.fileType ? `Loại file: ${item.fileType}` : '',
        item.fileSize ? `Kích thước: ${(item.fileSize / 1024).toFixed(2)} KB` : '',
        item.fileUrl ? `Link: ${item.fileUrl}` : '',
        `Ngày tạo: ${this.formatDate(item.createdAt)}`,
      ].filter(Boolean);
      return this.chunkText(parts.join('\n'));
    };
  }

  getDocumentChunkDataFn() {
    return (item, text, idx) => ({
      sourceId: item._id,
      chunkIndex: idx,
      text,
      title: item.title,
      classId: item.classId?._id || item.classId,
      rolesAllowed: ['student', 'teacher', 'admin'],
      metadata: { 
        fileName: item.fileName, 
        fileType: item.fileType,
        fileSize: item.fileSize,
        fileUrl: item.fileUrl,
        className: item.classId?.name,
        classCode: item.classId?.code,
        teacherName: item.teacherId?.fullName,
      },
    });
  }

  getCommentChunkFn() {
    return (item) => {
      const parts = [
        `Bình luận từ ${item.userId?.fullName || 'Người dùng'}`,
        item.userId?.role ? `Vai trò: ${item.userId.role}` : '',
        item.classId ? `Lớp: ${item.classId.name || ''} (Mã: ${item.classId.code || ''})` : '',
        `Nội dung: ${item.content}`,
        `Ngày đăng: ${this.formatDate(item.createdAt)}`,
      ].filter(Boolean);
      return this.chunkText(parts.join('\n'));
    };
  }

  getCommentChunkDataFn() {
    return (item, text, idx) => ({
      sourceId: item._id,
      chunkIndex: idx,
      text,
      title: `Bình luận từ ${item.userId?.fullName || 'Người dùng'}`,
      classId: item.classId?._id || item.classId,
      rolesAllowed: ['student', 'teacher', 'admin'],
      metadata: { 
        authorId: item.userId?._id,
        authorName: item.userId?.fullName,
        authorRole: item.userId?.role,
        className: item.classId?.name,
        classCode: item.classId?.code,
      },
    });
  }
}

// Export singleton instance
export const ragEventService = new RagEventService();

