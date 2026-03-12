import nodemailer from "nodemailer";

const getTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// Send welcome email to new employee
export const sendWelcomeEmail = async ({
  fullName,
  email,
  tempPassword,
  department,
  designation,
  createdByName,
}) => {
  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Welcome to StaffMaster EMS — Your Account is Ready",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            background: #f4f6fb; 
            margin: 0; padding: 0; 
          }
          .container { 
            max-width: 520px; 
            margin: 40px auto; 
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          }
          .header { 
            background: linear-gradient(135deg, #f59e0b, #f97316);
            padding: 36px 32px;
            text-align: center;
          }
          .header h1 { 
            color: #fff; 
            margin: 0; 
            font-size: 26px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header p {
            color: rgba(255,255,255,0.85);
            margin: 8px 0 0;
            font-size: 14px;
          }
          .body { padding: 32px; }
          .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #0f1624;
            margin-bottom: 12px;
          }
          .text { 
            color: #5a6478; 
            font-size: 14px; 
            line-height: 1.7;
            margin-bottom: 24px;
          }
          .credentials-box {
            background: #f8fafc;
            border: 1px solid #e4e8f0;
            border-radius: 12px;
            padding: 20px 24px;
            margin: 24px 0;
          }
          .credentials-box h3 {
            margin: 0 0 16px;
            font-size: 13px;
            color: #9aa3b5;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .credential-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e4e8f0;
          }
          .credential-row:last-child { border-bottom: none; }
          .cred-label { 
            font-size: 13px; 
            color: #9aa3b5;
            font-weight: 500;
          }
          .cred-value { 
            font-size: 14px; 
            color: #0f1624;
            font-weight: 600;
          }
          .password-value {
            font-family: 'Courier New', monospace;
            background: #fef3c7;
            padding: 4px 10px;
            border-radius: 6px;
            color: #92400e;
            font-weight: 700;
            letter-spacing: 1px;
          }
          .warning-box {
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 10px;
            padding: 14px 18px;
            margin: 20px 0;
            font-size: 13px;
            color: #92400e;
          }
          .warning-box strong { color: #78350f; }
          .info-row {
            display: flex;
            gap: 12px;
            margin: 20px 0;
          }
          .info-chip {
            background: #f0f3f8;
            border-radius: 8px;
            padding: 8px 14px;
            font-size: 13px;
            color: #5a6478;
          }
          .info-chip strong { color: #0f1624; display: block; font-size: 14px; }
          .footer {
            background: #f8fafc;
            border-top: 1px solid #e4e8f0;
            padding: 20px 32px;
            text-align: center;
            font-size: 12px;
            color: #9aa3b5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to StaffMaster</h1>
            <p>Your account has been created</p>
          </div>
          
          <div class="body">
            <div class="greeting">Hi ${fullName}! 👋</div>
            <div class="text">
              Your StaffMaster EMS account has been created by 
              <strong>${createdByName}</strong>. 
              You can now log in using the credentials below.
            </div>

            <div class="credentials-box">
              <h3>Your Login Credentials</h3>
              <div class="credential-row">
                <span class="cred-label">Email</span>
                <span class="cred-value">${email}</span>
              </div>
              <div class="credential-row">
                <span class="cred-label">Password</span>
                <span class="cred-value">
                  <span class="password-value">${tempPassword}</span>
                </span>
              </div>
            </div>

            <div class="info-row">
              <div class="info-chip">
                <strong>${department}</strong>
                Department
              </div>
              <div class="info-chip">
                <strong>${designation}</strong>
                Designation
              </div>
            </div>

            <div class="warning-box">
              <strong>⚠️ Important:</strong> This is a temporary password. 
              You will be required to change it on your first login. 
              Please keep your credentials secure.
            </div>

            <div class="text">
              If you have any issues logging in, 
              please contact your HR department.
            </div>
          </div>

          <div class="footer">
            This is an automated email from StaffMaster EMS.<br>
            Please do not reply to this email.
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Welcome email sent to: ${email}`);
};

// Send OTP email for password reset
export const sendOTPEmail = async ({ fullName, email, otp }) => {
  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "StaffMaster — Password Reset OTP",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
          .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #f59e0b, #f97316); padding: 32px; text-align: center; }
          .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
          .body { padding: 32px; text-align: center; }
          .greeting { font-size: 16px; color: #0f1624; font-weight: 600; margin-bottom: 8px; }
          .text { color: #5a6478; font-size: 14px; line-height: 1.7; margin-bottom: 28px; }
          .otp-box { background: #f8fafc; border: 2px dashed #f59e0b; border-radius: 16px; padding: 28px; margin: 24px 0; }
          .otp-label { font-size: 12px; color: #9aa3b5; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; }
          .otp-code { font-size: 48px; font-weight: 800; letter-spacing: 12px; color: #f59e0b; font-family: 'Courier New', monospace; }
          .expiry { font-size: 13px; color: #9aa3b5; margin-top: 12px; }
          .expiry strong { color: #ef4444; }
          .warning { background: #fef2f2; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #991b1b; margin: 20px 0; }
          .footer { background: #f8fafc; border-top: 1px solid #e4e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #9aa3b5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🔐 Password Reset</h1></div>
          <div class="body">
            <div class="greeting">Hi ${fullName}!</div>
            <div class="text">We received a request to reset your StaffMaster password. Use the OTP below.</div>
            <div class="otp-box">
              <div class="otp-label">Your OTP</div>
              <div class="otp-code">${otp}</div>
              <div class="expiry">Expires in <strong>15 minutes</strong></div>
            </div>
            <div class="warning">🚫 Never share this OTP with anyone. StaffMaster will never ask for your OTP.</div>
            <div class="text">If you didn't request this, please ignore this email. Your password will remain unchanged.</div>
          </div>
          <div class="footer">This is an automated email · Do not reply</div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`OTP email sent to: ${email}`);
};

// Send performance review notification to manager
export const sendPerformanceReviewEmail = async ({
  managerName,
  managerEmail,
  pendingCount,
  month,
  year,
  employees,
}) => {
  const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const transporter = getTransporter();

  const employeeRows = employees
    .map((e) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e4e8f0;font-size:14px;color:#0f1624;">${e.name}</td></tr>`)
    .join("");

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: managerEmail,
    subject: `StaffMaster — ${pendingCount} Performance Reviews Pending (${MONTH_NAMES[month]} ${year})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
          .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
          .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
          .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
          .body { padding: 32px; }
          .greeting { font-size: 18px; font-weight: 600; color: #0f1624; margin-bottom: 12px; }
          .text { color: #5a6478; font-size: 14px; line-height: 1.7; margin-bottom: 20px; }
          .count-badge { display: inline-block; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 16px 24px; margin: 16px 0; text-align: center; }
          .count-badge .num { font-size: 36px; font-weight: 800; color: #6366f1; }
          .count-badge .label { font-size: 12px; color: #9aa3b5; text-transform: uppercase; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th { text-align: left; padding: 8px 12px; font-size: 12px; color: #9aa3b5; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e4e8f0; }
          .footer { background: #f8fafc; border-top: 1px solid #e4e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #9aa3b5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Performance Reviews</h1>
            <p>${MONTH_NAMES[month]} ${year}</p>
          </div>
          <div class="body">
            <div class="greeting">Hi ${managerName}!</div>
            <div class="text">
              Monthly performance reviews have been generated. You have team members waiting for your review and feedback.
            </div>
            <div style="text-align:center;">
              <div class="count-badge">
                <div class="num">${pendingCount}</div>
                <div class="label">Pending Reviews</div>
              </div>
            </div>
            <table>
              <thead><tr><th>Employee</th></tr></thead>
              <tbody>${employeeRows}</tbody>
            </table>
            <div class="text">
              Please log in to StaffMaster and complete the reviews at your earliest convenience.
            </div>
          </div>
          <div class="footer">This is an automated email from StaffMaster EMS · Do not reply</div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Performance review email sent to: ${managerEmail}`);
};

// Send performance result email to employee
export const sendPerformanceResultEmail = async ({
  employeeName,
  employeeEmail,
  month,
  year,
  grade,
  finalScore,
  managerName,
}) => {
  const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const transporter = getTransporter();

  const gradeColors = { A: "#16a34a", B: "#2563eb", C: "#f59e0b", D: "#ea580c", F: "#dc2626" };
  const gradeColor = gradeColors[grade] || "#6366f1";

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: employeeEmail,
    subject: `StaffMaster — Your Performance Review for ${MONTH_NAMES[month]} ${year}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
          .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
          .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
          .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
          .body { padding: 32px; text-align: center; }
          .greeting { font-size: 18px; font-weight: 600; color: #0f1624; margin-bottom: 12px; }
          .text { color: #5a6478; font-size: 14px; line-height: 1.7; margin-bottom: 20px; text-align: left; }
          .grade-box { display: inline-block; border-radius: 20px; padding: 24px 40px; margin: 20px 0; text-align: center; }
          .grade-letter { font-size: 64px; font-weight: 900; }
          .grade-label { font-size: 12px; color: #9aa3b5; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
          .score-row { display: flex; justify-content: center; gap: 20px; margin: 20px 0; }
          .score-chip { background: #f8fafc; border: 1px solid #e4e8f0; border-radius: 12px; padding: 12px 20px; text-align: center; }
          .score-chip .val { font-size: 20px; font-weight: 700; color: #0f1624; }
          .score-chip .lbl { font-size: 11px; color: #9aa3b5; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer { background: #f8fafc; border-top: 1px solid #e4e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #9aa3b5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Performance Result</h1>
            <p>${MONTH_NAMES[month]} ${year}</p>
          </div>
          <div class="body">
            <div class="greeting">Hi ${employeeName}!</div>
            <div class="text">
              Your performance review for <strong>${MONTH_NAMES[month]} ${year}</strong> has been completed by <strong>${managerName}</strong>. Here's your result:
            </div>
            <div class="grade-box" style="background:${gradeColor}15;border:2px solid ${gradeColor};">
              <div class="grade-letter" style="color:${gradeColor};">${grade}</div>
              <div class="grade-label">Overall Grade</div>
            </div>
            <div style="display:flex;justify-content:center;gap:20px;margin:20px 0;">
              <div class="score-chip">
                <div class="val">${finalScore}</div>
                <div class="lbl">Final Score</div>
              </div>
            </div>
            <div class="text">
              Log in to StaffMaster to view the detailed breakdown of your performance review, including attendance score, task score, and manager feedback.
            </div>
          </div>
          <div class="footer">This is an automated email from StaffMaster EMS · Do not reply</div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Performance result email sent to: ${employeeEmail}`);
};

/**
 * Send payslip ready notification email to an employee.
 */
export const sendPayslipReadyEmail = async ({
  fullName,
  email,
  month,
  year,
  netSalary,
}) => {
  const transporter = getTransporter();
  const fmtSalary = `₹${Number(netSalary).toLocaleString("en-IN")}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `StaffMaster — Your Payslip for ${month} ${year} is Ready`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
          .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #f59e0b, #f97316); padding: 32px; text-align: center; }
          .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
          .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
          .body { padding: 32px; text-align: center; }
          .greeting { font-size: 18px; font-weight: 600; color: #0f1624; margin-bottom: 12px; }
          .text { color: #5a6478; font-size: 14px; line-height: 1.7; margin-bottom: 20px; text-align: left; }
          .salary-box { background: #fffbeb; border: 2px solid #f59e0b; border-radius: 16px; padding: 24px; margin: 24px 0; text-align: center; }
          .salary-amount { font-size: 36px; font-weight: 900; color: #92400e; }
          .salary-label { font-size: 12px; color: #b45309; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
          .info-row { display: flex; justify-content: center; gap: 16px; margin: 20px 0; }
          .info-chip { background: #f8fafc; border: 1px solid #e4e8f0; border-radius: 10px; padding: 10px 18px; text-align: center; }
          .info-chip strong { display: block; color: #0f1624; font-size: 14px; }
          .info-chip span { font-size: 11px; color: #9aa3b5; }
          .footer { background: #f8fafc; border-top: 1px solid #e4e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #9aa3b5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Payslip Ready</h1>
            <p>${month} ${year}</p>
          </div>
          <div class="body">
            <div class="greeting">Hi ${fullName}! 👋</div>
            <div class="text">
              Your salary for <strong>${month} ${year}</strong> has been processed and marked as paid. Here's a quick summary:
            </div>
            <div class="salary-box">
              <div class="salary-amount">${fmtSalary}</div>
              <div class="salary-label">Net Salary</div>
            </div>
            <div class="info-row">
              <div class="info-chip">
                <strong>${month}</strong>
                <span>Month</span>
              </div>
              <div class="info-chip">
                <strong>${year}</strong>
                <span>Year</span>
              </div>
            </div>
            <div class="text">
              Log in to StaffMaster to view and download your detailed payslip as a PDF.
            </div>
          </div>
          <div class="footer">This is an automated email from StaffMaster EMS · Do not reply</div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Payslip ready email sent to: ${email}`);
};
