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
