const nodemailer = require("nodemailer");


// ========================================
// Gmail Transporter
// ========================================

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// ========================================
// Email Styles
// ========================================

const emailStyles = `
  <style>

    body {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
    }

    .email-wrapper {
      width: 100%;
      padding: 40px 15px;
      background-color: #f3f4f6;
      box-sizing: border-box;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
    }

    .header {
      background: linear-gradient(
        135deg,
        #2563eb,
        #4f46e5
      );

      padding: 30px;
      text-align: center;
      color: #ffffff;
    }

    .logo {
      width: 55px;
      height: 55px;
      margin: 0 auto 12px;

      background-color: rgba(255, 255, 255, 0.18);

      border: 1px solid rgba(255, 255, 255, 0.3);

      border-radius: 14px;

      display: flex;
      align-items: center;
      justify-content: center;

      font-size: 22px;
      font-weight: bold;
      letter-spacing: 1px;
    }

    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }

    .header p {
      margin: 8px 0 0;
      font-size: 13px;
      opacity: 0.9;
    }

    .content {
      padding: 35px;
    }

    .greeting {
      font-size: 17px;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .message {
      font-size: 14px;
      line-height: 1.7;
      color: #6b7280;
      margin-bottom: 25px;
    }

    .task-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      margin: 25px 0;
    }

    .task-card-header {
      background-color: #f9fafb;
      padding: 16px 20px;
      border-bottom: 1px solid #e5e7eb;
    }

    .task-card-header span {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .task-card-body {
      padding: 20px;
    }

    .task-title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
    }

    .task-description {
      font-size: 14px;
      line-height: 1.7;
      color: #6b7280;
    }

    .status {
      display: inline-block;
      margin-top: 18px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background-color: #eff6ff;
      color: #2563eb;
    }

    .success-status {
      background-color: #ecfdf5;
      color: #059669;
    }

    .button-container {
      text-align: center;
      margin: 30px 0 10px;
    }

    .button {
      display: inline-block;
      padding: 13px 28px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
    }

    .footer {
      padding: 22px 30px;
      text-align: center;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }

    .footer p {
      margin: 4px 0;
      font-size: 12px;
      color: #9ca3af;
    }

    .footer strong {
      color: #6b7280;
    }

    @media only screen and (max-width: 600px) {

      .email-wrapper {
        padding: 20px 10px;
      }

      .content {
        padding: 25px 20px;
      }

      .header {
        padding: 25px 20px;
      }

      .task-title {
        font-size: 18px;
      }

    }

  </style>
`;


// ========================================
// Test Email Server
// ========================================

const testEmail = async () => {
  try {

    await transporter.verify();

    console.log("=================================");
    console.log("EMAIL SERVER IS READY ✅");
    console.log("=================================");

  } catch (error) {

    console.log("=================================");
    console.log("EMAIL SERVER ERROR ❌");
    console.log(error.message);
    console.log("=================================");

  }
};


// ========================================
// Generic Send Email
// ========================================

const sendEmail = async (to, subject, html) => {

  try {

    const info = await transporter.sendMail({

      from:
        `"TMS - Task Management System" <${process.env.EMAIL_USER}>`,

      to,

      subject,

      html,
    });

    console.log("=================================");
    console.log("EMAIL SENT SUCCESSFULLY ✅");
    console.log("To:", to);
    console.log("Message ID:", info.messageId);
    console.log("=================================");

    return info;

  } catch (error) {

    console.error("=================================");
    console.error("EMAIL SENDING FAILED ❌");
    console.error(error.message);
    console.error("=================================");

    throw error;
  }
};


// ========================================
// TASK ASSIGNED EMAIL
// ========================================

const sendTaskAssignedEmail = async ({
  userName,
  userEmail,
  taskTitle,
  taskDescription,
}) => {

  const html = `

    <!DOCTYPE html>

    <html>

      <head>

        <meta charset="UTF-8">

        ${emailStyles}

      </head>

      <body>

        <div class="email-wrapper">

          <div class="email-container">


            <!-- HEADER -->

            <div class="header">

              <div class="logo">
                TMS
              </div>

              <h1>
                New Task Assigned
              </h1>

              <p>
                Task Management System
              </p>

            </div>


            <!-- CONTENT -->

            <div class="content">

              <div class="greeting">
                Hello ${userName} 👋
              </div>

              <div class="message">

                You have received a new task from the
                administrator. Please review the details
                below and start working on it.

              </div>


              <!-- TASK CARD -->

              <div class="task-card">

                <div class="task-card-header">

                  <span>
                    New Assignment
                  </span>

                </div>

                <div class="task-card-body">

                  <div class="task-title">
                    ${taskTitle}
                  </div>

                  <div class="task-description">

                    ${
                      taskDescription ||
                      "No description was provided for this task."
                    }

                  </div>

                  <span class="status">
                    Pending
                  </span>

                </div>

              </div>


              <!-- BUTTON -->

              <div class="button-container">

                <a
                  href="http://localhost:5173/tasks"
                  class="button"
                >
                  View My Tasks
                </a>

              </div>


              <div class="message">

                Please complete the task within the
                expected timeline and update its status
                once completed.

              </div>

            </div>


            <!-- FOOTER -->

            <div class="footer">

              <p>
                This email was sent by
                <strong>TMS</strong>
              </p>

              <p>
                Task Management System
              </p>

              <p>
                © ${new Date().getFullYear()} TMS
              </p>

            </div>


          </div>

        </div>

      </body>

    </html>

  `;

  return sendEmail(
    userEmail,
    "📋 New Task Assigned - TMS",
    html
  );
};


// ========================================
// TASK COMPLETED EMAIL
// ========================================

const sendTaskCompletedEmail = async ({
  adminEmail,
  taskTitle,
  userName,
}) => {

  const html = `

    <!DOCTYPE html>

    <html>

      <head>

        <meta charset="UTF-8">

        ${emailStyles}

      </head>

      <body>

        <div class="email-wrapper">

          <div class="email-container">


            <!-- HEADER -->

            <div class="header">

              <div class="logo">
                TMS
              </div>

              <h1>
                Task Completed 🎉
              </h1>

              <p>
                Task Management System
              </p>

            </div>


            <!-- CONTENT -->

            <div class="content">

              <div class="greeting">
                Hello Admin 👋
              </div>

              <div class="message">

                Great news! A user has successfully
                completed an assigned task.

              </div>


              <!-- TASK CARD -->

              <div class="task-card">

                <div class="task-card-header">

                  <span>
                    Completed Task
                  </span>

                </div>

                <div class="task-card-body">

                  <div class="task-title">
                    ${taskTitle}
                  </div>

                  <div class="task-description">

                    This task was completed by
                    <strong>${userName}</strong>.

                  </div>

                  <span class="status success-status">
                    ✓ Completed
                  </span>

                </div>

              </div>


              <!-- BUTTON -->

              <div class="button-container">

                <a
                  href="http://localhost:5173/admin/tasks"
                  class="button"
                >
                  View Task
                </a>

              </div>


              <div class="message">

                You can login to the TMS Admin Panel
                to review the completed task and take
                any further action if required.

              </div>

            </div>


            <!-- FOOTER -->

            <div class="footer">

              <p>
                This email was sent by
                <strong>TMS</strong>
              </p>

              <p>
                Task Management System
              </p>

              <p>
                © ${new Date().getFullYear()} TMS
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(
    adminEmail,
    "🎉 Task Completed - TMS",
    html
  );
};


// ========================================
// MENTION EMAIL
// ========================================

const sendMentionEmail = async ({
  userName,
  userEmail,
  senderName,
  taskTitle,
  commentText,
  taskId,
}) => {
  const taskUrl = `http://localhost:5173/tasks/${taskId}/detail`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        ${emailStyles}
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <div class="header" style="background: linear-gradient(135deg, #0284c7, #06b6d4);">
              <div class="logo">TMS</div>
              <h1>You Were Mentioned</h1>
              <p>Task Collaboration</p>
            </div>
            <div class="content">
              <div class="greeting">Hello ${userName} 👋</div>
              <div class="message">
                <strong>${senderName}</strong> mentioned you in a comment on task:
              </div>
              <div class="task-card">
                <div class="task-card-header">
                  <span>${taskTitle}</span>
                </div>
                <div class="task-card-body">
                  <div class="task-description" style="font-style: italic; color: #1e293b; font-size: 15px;">
                    “${commentText}”
                  </div>
                </div>
              </div>
              <div class="button-container">
                <a href="${taskUrl}" class="button" style="background-color: #0284c7;">
                  View & Reply to Comment
                </a>
              </div>
            </div>
            <div class="footer">
              <p>This email was sent by <strong>TMS</strong></p>
              <p>© ${new Date().getFullYear()} TMS</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(userEmail, `💬 ${senderName} mentioned you on "${taskTitle}" - TMS`, html);
};


// ========================================
// DUE SOON REMINDER EMAIL
// ========================================

const sendDueSoonEmail = async ({
  userName,
  userEmail,
  taskTitle,
  dueDate,
  taskId,
}) => {
  const formattedDate = new Date(dueDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const taskUrl = `http://localhost:5173/tasks/${taskId}/detail`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        ${emailStyles}
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <div class="header" style="background: linear-gradient(135deg, #d97706, #f59e0b);">
              <div class="logo">TMS</div>
              <h1>Task Due Soon ⏰</h1>
              <p>Deadline Reminder</p>
            </div>
            <div class="content">
              <div class="greeting">Hello ${userName} 👋</div>
              <div class="message">
                This is a friendly reminder that one of your assigned tasks has a deadline coming up within the next 24 hours.
              </div>
              <div class="task-card" style="border-left: 4px solid #f59e0b;">
                <div class="task-card-header">
                  <span>Upcoming Deadline: ${formattedDate}</span>
                </div>
                <div class="task-card-body">
                  <div class="task-title">${taskTitle}</div>
                  <span class="status" style="background-color: #fef3c7; color: #b45309;">
                    ⏳ Due Soon
                  </span>
                </div>
              </div>
              <div class="button-container">
                <a href="${taskUrl}" class="button" style="background-color: #d97706;">
                  View Task & Update Status
                </a>
              </div>
            </div>
            <div class="footer">
              <p>This email was sent by <strong>TMS</strong></p>
              <p>© ${new Date().getFullYear()} TMS</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(userEmail, `⏰ Reminder: "${taskTitle}" is due soon - TMS`, html);
};


// ========================================
// OVERDUE ALERT EMAIL
// ========================================

const sendOverdueEmail = async ({
  userName,
  userEmail,
  taskTitle,
  dueDate,
  taskId,
}) => {
  const formattedDate = new Date(dueDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const taskUrl = `http://localhost:5173/tasks/${taskId}/detail`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        ${emailStyles}
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <div class="header" style="background: linear-gradient(135deg, #dc2626, #ef4444);">
              <div class="logo">TMS</div>
              <h1>Task Overdue Alert 🚨</h1>
              <p>Urgent Action Required</p>
            </div>
            <div class="content">
              <div class="greeting">Hello ${userName} 👋</div>
              <div class="message">
                The deadline for your assigned task has passed. Please complete the task or update its timeline as soon as possible.
              </div>
              <div class="task-card" style="border-left: 4px solid #dc2626;">
                <div class="task-card-header">
                  <span>Was Due On: ${formattedDate}</span>
                </div>
                <div class="task-card-body">
                  <div class="task-title">${taskTitle}</div>
                  <span class="status" style="background-color: #fee2e2; color: #b91c1c;">
                    ⚠️ Past Due
                  </span>
                </div>
              </div>
              <div class="button-container">
                <a href="${taskUrl}" class="button" style="background-color: #dc2626;">
                  View & Complete Task
                </a>
              </div>
            </div>
            <div class="footer">
              <p>This email was sent by <strong>TMS</strong></p>
              <p>© ${new Date().getFullYear()} TMS</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(userEmail, `🚨 Overdue Alert: "${taskTitle}" - TMS`, html);
};


// ========================================
// WEEKLY PRODUCTIVITY DIGEST EMAIL
// ========================================

const sendWeeklyDigestEmail = async ({
  userName,
  userEmail,
  completedCount,
  pendingCount,
  inProgressCount,
  overdueCount,
  weekRange,
}) => {
  const total = completedCount + pendingCount + inProgressCount;
  const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 100;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        ${emailStyles}
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <div class="header" style="background: linear-gradient(135deg, #4f46e5, #7c3aed);">
              <div class="logo">TMS</div>
              <h1>Weekly Productivity Digest 📊</h1>
              <p>${weekRange || "This Week's Summary"}</p>
            </div>
            <div class="content">
              <div class="greeting">Hello ${userName} 👋</div>
              <div class="message">
                Here is your weekly summary of tasks and productivity performance across the Task Management System:
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 10px; text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: #15803d;">${completedCount}</div>
                  <div style="font-size: 12px; color: #166534; font-weight: 600;">Completed Tasks</div>
                </div>
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 10px; text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: #1d4ed8;">${inProgressCount}</div>
                  <div style="font-size: 12px; color: #1e40af; font-weight: 600;">In Progress</div>
                </div>
                <div style="background: #fefce8; border: 1px solid #fef08a; padding: 15px; border-radius: 10px; text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: #a16207;">${pendingCount}</div>
                  <div style="font-size: 12px; color: #854d0e; font-weight: 600;">Pending Tasks</div>
                </div>
                <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 10px; text-align: center;">
                  <div style="font-size: 24px; font-weight: bold; color: #b91c1c;">${overdueCount}</div>
                  <div style="font-size: 12px; color: #991b1b; font-weight: 600;">Overdue Tasks</div>
                </div>
              </div>
              <div style="margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 10px; text-align: center;">
                <span style="font-size: 14px; font-weight: 600; color: #334155;">Weekly Completion Rate: </span>
                <span style="font-size: 18px; font-weight: 800; color: #4f46e5;">${completionRate}%</span>
              </div>
              <div class="button-container">
                <a href="http://localhost:5173/dashboard" class="button" style="background-color: #4f46e5;">
                  Go to My Dashboard
                </a>
              </div>
            </div>
            <div class="footer">
              <p>This email was sent by <strong>TMS</strong></p>
              <p>© ${new Date().getFullYear()} TMS</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(userEmail, `📊 Your Weekly Productivity Digest - TMS`, html);
};


// ========================================
// Test SMTP Connection
// ========================================

testEmail();


// ========================================
// Export
// ========================================

module.exports = {
  sendEmail,
  sendTaskAssignedEmail,
  sendTaskCompletedEmail,
  sendMentionEmail,
  sendDueSoonEmail,
  sendOverdueEmail,
  sendWeeklyDigestEmail,
};