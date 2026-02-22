import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiFetch } from "../utils/api";
import { toast } from "react-hot-toast";

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { API, updateToken, user } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (formData.newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const result = await apiFetch(`${API}/auth/change-password`, {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (result && result.data.success) {
        toast.success("Password updated successfully!");

        // Update token with new one (where mustChangePassword is false)
        if (result.data.token) {
          updateToken(result.data.token);
        }

        // Redirect based on role
        if (user?.role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/");
        }
      } else if (result) {
        setError(result.data.message || "Failed to update password");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-page-bg)] px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[var(--color-blob-1)] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-[var(--color-blob-2)] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 bg-[var(--color-card)] backdrop-blur-lg p-10 rounded-3xl border border-[var(--color-border)]">
        <div className="text-center">
          <h2 className="mt-2 text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">
            Change Password
          </h2>
          <p className="mt-3 text-base text-[var(--color-text-muted)] font-medium">
            For security reasons, you must change your password before
            continuing.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/5 text-red-500 p-3 rounded-lg text-sm text-center font-medium border border-red-100">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1 ml-1">
                Current Password
              </label>
              <input
                name="currentPassword"
                type="password"
                required
                value={formData.currentPassword}
                onChange={handleInputChange}
                className="block w-full px-4 py-3.5 bg-[var(--color-surface)] border-transparent focus:bg-[var(--color-card)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-border)] rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-200 font-medium"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1 ml-1">
                New Password
              </label>
              <input
                name="newPassword"
                type="password"
                required
                value={formData.newPassword}
                onChange={handleInputChange}
                className="block w-full px-4 py-3.5 bg-[var(--color-surface)] border-transparent focus:bg-[var(--color-card)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-border)] rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-200 font-medium"
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1 ml-1">
                Confirm New Password
              </label>
              <input
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="block w-full px-4 py-3.5 bg-[var(--color-surface)] border-transparent focus:bg-[var(--color-card)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-border)] rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-200 font-medium"
                placeholder="Min 8 characters"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-[var(--color-btn-text)] bg-[var(--color-btn-bg)] hover:bg-[var(--color-btn-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-accent)] transition duration-300 hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
