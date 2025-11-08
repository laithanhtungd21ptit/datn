import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Gmail address
    pass: process.env.SMTP_PASS  // Gmail app password
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection failed:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

// Email templates
const templates = {
  passwordReset: (resetLink) => ({
    subject: 'Đặt lại mật khẩu - Assignment Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0084FF;">Đặt lại mật khẩu</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
        <p>Nhấp vào liên kết dưới đây để đặt lại mật khẩu:</p>
        <a href="${resetLink}" style="background-color: #0084FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">Đặt lại mật khẩu</a>
        <p>Liên kết này sẽ hết hạn sau 1 giờ.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ Assignment Management System.</p>
      </div>
    `
  }),

  assignmentDue: (assignmentTitle, dueDate, className) => ({
    subject: `Nhắc nhở deadline bài tập: ${assignmentTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0084FF;">Nhắc nhở deadline</h2>
        <p>Bài tập <strong>${assignmentTitle}</strong> trong lớp <strong>${className}</strong> sắp đến hạn.</p>
        <p><strong>Hạn nộp:</strong> ${new Date(dueDate).toLocaleString('vi-VN')}</p>
        <p>Vui lòng nộp bài tập trước thời hạn để tránh bị trừ điểm.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ Assignment Management System.</p>
      </div>
    `
  }),

  assignmentGraded: (assignmentTitle, score, className, notes = '') => ({
    subject: `Điểm bài tập: ${assignmentTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0084FF;">Bài tập đã được chấm điểm</h2>
        <p>Bài tập <strong>${assignmentTitle}</strong> trong lớp <strong>${className}</strong> đã được chấm điểm.</p>
        <p><strong>Điểm số:</strong> ${score}/10</p>
        ${notes ? `<p><strong>Nhận xét:</strong> ${notes}</p>` : ''}
        <p>Đăng nhập vào hệ thống để xem chi tiết.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ Assignment Management System.</p>
      </div>
    `
  }),

  welcome: (fullName) => ({
    subject: 'Chào mừng đến với Assignment Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0084FF;">Chào mừng ${fullName}!</h2>
        <p>Tài khoản của bạn đã được tạo thành công trong Assignment Management System.</p>
        <p>Vui lòng đăng nhập và cập nhật thông tin cá nhân.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ Assignment Management System.</p>
      </div>
    `
  })
};

// Send email function
export const sendEmail = async (to, templateName, templateData = {}) => {
  try {
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const { subject, html } = typeof template === 'function' ? template(...Object.values(templateData)) : template;

    const mailOptions = {
      from: `"Assignment Management System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

// Helper functions for common emails
export const sendPasswordResetEmail = (email, resetLink) => {
  return sendEmail(email, 'passwordReset', [resetLink]);
};

export const sendAssignmentDueReminder = (email, assignmentTitle, dueDate, className) => {
  return sendEmail(email, 'assignmentDue', [assignmentTitle, dueDate, className]);
};

export const sendAssignmentGradedEmail = (email, assignmentTitle, score, className, notes) => {
  return sendEmail(email, 'assignmentGraded', [assignmentTitle, score, className, notes]);
};

export const sendWelcomeEmail = (email, fullName) => {
  return sendEmail(email, 'welcome', [fullName]);
};
