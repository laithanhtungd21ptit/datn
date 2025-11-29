import nodemailer from 'nodemailer';

const smtpPort = Number(process.env.SMTP_PORT || 587);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465,
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

// Verify connection in non-test environments
if (process.env.NODE_ENV !== 'test') {
  transporter.verify((error) => {
    if (error) {
      console.error('SMTP connection failed:', error.message);
    } else {
      console.log('SMTP server is ready to send emails');
    }
  });
}

const templates = {
  passwordReset: ({ fullName = 'bạn', token, expiresInMinutes = 3 }) => {
    const tokenBlock = token
      ? `<p>Mã xác nhận của bạn là: <strong>${token}</strong></p>`
      : '';

    return {
      subject: 'Đặt lại mật khẩu - Assignment Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0084FF;">Xin chào ${fullName},</h2>
          <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
          ${tokenBlock}
          <p>Vui lòng quay lại màn hình "Quên mật khẩu" trong hệ thống và nhập mã để tiếp tục.</p>
          <p>Mã xác nhận này sẽ hết hạn sau ${expiresInMinutes} phút.</p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ Assignment Management System.</p>
        </div>
      `,
    };
  },

  assignmentDue: ({ assignmentTitle, dueDate, className }) => ({
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
    `,
  }),

  assignmentGraded: ({ assignmentTitle, score, className, notes = '' }) => ({
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
    `,
  }),

  welcome: ({ fullName }) => ({
    subject: 'Chào mừng đến với Assignment Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0084FF;">Chào mừng ${fullName}!</h2>
        <p>Tài khoản của bạn đã được tạo thành công trong Assignment Management System.</p>
        <p>Vui lòng đăng nhập và cập nhật thông tin cá nhân.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ Assignment Management System.</p>
      </div>
    `,
  }),
};

export const sendEmail = async (to, templateName, templateData = {}) => {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template ${templateName} not found`);
  }

  const { subject, html } = typeof template === 'function' ? template(templateData) : template;

  const mailOptions = {
    from: `"Assignment Management System" <${process.env.SMTP_USER || 'no-reply@example.com'}>`,
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent successfully:', info.messageId);
  return { success: true, messageId: info.messageId };
};

export const sendPasswordResetEmail = (email, data) => {
  return sendEmail(email, 'passwordReset', data);
};

export const sendAssignmentDueReminder = (email, assignmentTitle, dueDate, className) => {
  return sendEmail(email, 'assignmentDue', { assignmentTitle, dueDate, className });
};

export const sendAssignmentGradedEmail = (email, assignmentTitle, score, className, notes) => {
  return sendEmail(email, 'assignmentGraded', { assignmentTitle, score, className, notes });
};

export const sendWelcomeEmail = (email, fullName) => {
  return sendEmail(email, 'welcome', { fullName });
};
