import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";

/* ── OTP Input: 6 individual boxes ── */
const OTPInput = ({ value, onChange, hasError }) => {
  const inputs = useRef([]);

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...value];
      if (next[idx]) {
        next[idx] = "";
        onChange(next);
      } else if (idx > 0) {
        next[idx - 1] = "";
        onChange(next);
        inputs.current[idx - 1]?.focus();
      }
    }
  };

  const handleChange = (e, idx) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[idx] = char;
    onChange(next);
    if (char && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    onChange(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputs.current[focusIdx]?.focus();
  };

  return (
    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
      {Array(6).fill(null).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => (inputs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ""}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          style={{
            width: "48px",
            height: "48px",
            textAlign: "center",
            fontSize: "24px",
            fontWeight: 700,
            borderRadius: "10px",
            border: hasError
              ? "2px solid #ef4444"
              : value[idx]
              ? "2px solid var(--color-accent)"
              : "1px solid var(--color-border)",
            backgroundColor: value[idx]
              ? "rgba(245,158,11,0.08)"
              : "var(--color-surface)",
            color: "var(--color-text-primary)",
            outline: "none",
            transition: "border-color 0.15s ease, background-color 0.15s ease",
            animation: hasError ? "shake 0.4s ease" : "none",
          }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
};

/* ── Views ── */
const VIEW_LOGIN = "login";
const VIEW_FORGOT = "forgot";
const VIEW_OTP = "otp";
const VIEW_RESET = "reset";

const Login = () => {
  const navigate = useNavigate();
  const { user, login, API } = useAuth();

  useEffect(() => {
    if (user && ["admin", "hr", "manager", "employee"].includes(user.role)) {
      navigate(`/${user.role}/dashboard`, { replace: true });
    }
  }, [user, navigate]);

  /* ── Shared ── */
  const [view, setView] = useState(VIEW_LOGIN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ── View 1: Login ── */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /* ── View 2: Forgot ── */
  const [forgotEmail, setForgotEmail] = useState("");

  /* ── View 3: OTP + Reset ── */
  const [otpDigits, setOtpDigits] = useState(Array(6).fill(""));
  const [otpError, setOtpError] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ── Resend countdown ── */
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  const startCountdown = useCallback(() => {
    setCountdown(60);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  /* ──────────────── Handlers ──────────────── */

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.success) {
        login(data.token);
        if (data.user.mustChangePassword) {
          toast("You must change your temporary password.", { icon: "🔐" });
          navigate("/change-password");
        } else {
          toast.success("Login successful");
          const role = data.user.role;
          navigate(`/${role}/dashboard`);
        }
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e?.preventDefault();
    setError("");
    if (!forgotEmail.trim()) { setError("Please enter your email."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpDigits(Array(6).fill(""));
        setNewPassword("");
        setConfirmPassword("");
        setOtpError(false);
        setSuccess(false);
        setView(VIEW_OTP);
        startCountdown();
        toast.success("OTP sent! Check your email.");
      } else {
        setError(data.message);
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    await handleSendOTP();
  };

  const handleCheckOTP = async (e) => {
    e.preventDefault();
    setError("");
    setOtpError(false);

    const otpValue = otpDigits.join("");
    if (otpValue.length < 6) { setError("Please enter the complete 6-digit OTP."); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/check-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: otpValue }),
      });
      const data = await res.json();
      if (data.success) {
        setError("");
        setNewPassword("");
        setConfirmPassword("");
        setView(VIEW_RESET);
      } else {
        const msg = data.message || "";
        if (msg.toLowerCase().includes("wrong otp") || msg.toLowerCase().includes("attempts")) {
          setOtpError(true);
          setOtpDigits(Array(6).fill(""));
          setTimeout(() => setOtpError(false), 500);
        }
        if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("new otp")) {
          setTimeout(() => setView(VIEW_FORGOT), 1500);
        }
        setError(msg);
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword) { setError("Please enter a new password."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        clearInterval(timerRef.current);
        setTimeout(() => {
          setView(VIEW_LOGIN);
          setSuccess(false);
          setForgotEmail("");
          setOtpDigits(Array(6).fill(""));
          setNewPassword("");
          setConfirmPassword("");
        }, 2500);
      } else {
        if ((data.message || "").toLowerCase().includes("session expired")) {
          setTimeout(() => setView(VIEW_OTP), 1500);
        }
        setError(data.message);
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ──────────────── Render helpers ──────────────── */

  const Background = () => (
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[var(--color-blob-1)] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-[var(--color-blob-2)] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
    </div>
  );

  const ErrorBox = () =>
    error ? (
      <div className="bg-red-500/5 text-red-500 p-3 rounded-lg text-sm text-center font-medium border border-red-100">
        {error}
      </div>
    ) : null;

  const inputClass =
    "block w-full px-4 py-3.5 bg-[var(--color-surface)] border-transparent focus:bg-[var(--color-card)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-border)] rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-200 font-medium";

  const btnClass =
    "w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-[var(--color-btn-text)] bg-[var(--color-btn-bg)] hover:bg-[var(--color-btn-hover)] focus:outline-none transition duration-300 hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed";

  const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-[var(--color-text-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  /* ──────────────── VIEW 1: LOGIN ──────────────── */
  if (view === VIEW_LOGIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-page-bg)] px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <Background />
        <div className="max-w-md w-full space-y-8 bg-[var(--color-card)] backdrop-blur-lg p-10 rounded-3xl border border-[var(--color-border)]">
          <div className="text-center">
            <h2 className="mt-2 text-4xl font-bold text-[var(--color-text-primary)] tracking-tight">Welcome back</h2>
            <p className="mt-3 text-base text-[var(--color-text-muted)] font-medium">Please enter your details to sign in.</p>
          </div>

          <ErrorBox />

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1 ml-1">Email address</label>
                <input
                  type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputClass} placeholder="name@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1 ml-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} autoComplete="current-password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-12`} placeholder="••••••••"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={() => { setView(VIEW_FORGOT); setError(""); }}
                className="text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition duration-200">
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} className={btnClass}>
              {loading ? <Spinner /> : "Sign in"}
            </button>
          </form>

          <div className="text-center text-sm text-[var(--color-text-muted)] font-medium">
            Note: Registration is restricted to HR &amp; Admin.
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────── VIEW 2: FORGOT PASSWORD ──────────────── */
  if (view === VIEW_FORGOT) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-page-bg)] px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <Background />
        <div className="max-w-md w-full space-y-8 bg-[var(--color-card)] backdrop-blur-lg p-10 rounded-3xl border border-[var(--color-border)]">
          <div>
            <button type="button" onClick={() => { setView(VIEW_LOGIN); setError(""); }}
              className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition mb-6">
              <ArrowLeft size={16} /> Back to Login
            </button>
            <h2 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Forgot Password</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)] font-medium">Enter your email and we'll send you a 6-digit OTP.</p>
          </div>

          <ErrorBox />

          <form className="space-y-6" onSubmit={handleSendOTP}>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1 ml-1">Email address</label>
              <input
                type="email" autoComplete="email" required
                value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                className={inputClass} placeholder="name@company.com"
              />
            </div>

            <button type="submit" disabled={loading} className={btnClass}>
              {loading ? <Spinner /> : "Send OTP"}
            </button>
          </form>

          <div className="text-center text-sm text-[var(--color-text-muted)]">
            Remember your password?{" "}
            <button type="button" onClick={() => { setView(VIEW_LOGIN); setError(""); }}
              className="font-semibold text-[var(--color-accent)] hover:underline">
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────── VIEW 3: OTP VERIFY ──────────────── */
  if (view === VIEW_OTP) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-page-bg)] px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <Background />

        <style>{`
          @keyframes shake {
            0%,100% { transform: translateX(0); }
            20% { transform: translateX(-6px); }
            40% { transform: translateX(6px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
          }
        `}</style>

        <div className="max-w-md w-full space-y-6 bg-[var(--color-card)] backdrop-blur-lg p-10 rounded-3xl border border-[var(--color-border)]">
          <div>
            <button type="button" onClick={() => { setView(VIEW_FORGOT); setError(""); }}
              className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition mb-6">
              <ArrowLeft size={16} /> Back
            </button>
            <h2 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Enter OTP</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              OTP sent to <span className="font-semibold text-[var(--color-text-primary)]">{forgotEmail}</span>
            </p>
          </div>

          <ErrorBox />

          <form className="space-y-6" onSubmit={handleCheckOTP}>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-3 ml-1">6-digit OTP</label>
              <OTPInput value={otpDigits} onChange={setOtpDigits} hasError={otpError} />
            </div>

            <button type="submit" disabled={loading} className={btnClass}>
              {loading ? <Spinner /> : "Verify OTP"}
            </button>
          </form>

          <div className="text-center text-sm text-[var(--color-text-muted)]">
            Didn't receive OTP?{" "}
            {countdown > 0 ? (
              <span className="font-semibold">Resend in {countdown}s</span>
            ) : (
              <button type="button" onClick={handleResendOTP} disabled={loading}
                className="font-semibold text-[var(--color-accent)] hover:underline disabled:opacity-50">
                Resend OTP
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────── VIEW 4: NEW PASSWORD ──────────────── */
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-page-bg)] px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <Background />

      <div className="max-w-md w-full space-y-6 bg-[var(--color-card)] backdrop-blur-lg p-10 rounded-3xl border border-[var(--color-border)]">
        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="flex justify-center">
              <CheckCircle size={64} className="text-green-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">Password Reset!</h3>
            <p className="text-sm text-[var(--color-text-muted)]">Your password has been reset successfully. Redirecting to login…</p>
          </div>
        ) : (
          <>
            <div>
              <button type="button" onClick={() => { setView(VIEW_OTP); setError(""); }}
                className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition mb-6">
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">New Password</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">OTP verified. Set your new password.</p>
            </div>

            <ErrorBox />

            <form className="space-y-5" onSubmit={handleResetPassword}>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1 ml-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"} required minLength={8}
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className={`${inputClass} pr-12`} placeholder="Min. 8 characters"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowNew((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1 ml-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"} required
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${inputClass} pr-12`} placeholder="Re-enter new password"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 ml-1 text-xs font-medium text-red-500">Passwords do not match</p>
                )}
              </div>

              <button type="submit" disabled={loading} className={btnClass}>
                {loading ? <Spinner /> : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
