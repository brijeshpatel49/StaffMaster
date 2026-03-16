import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../../hooks/useAuth";
import AdminLayout from "../../../layouts/AdminLayout";
import { apiFetch } from "../../../utils/api";

const HRList = () => {
  const { API, token } = useAuth();
  const [hrUsers, setHrUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState({ sent: false, address: "" });

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
  });

  // Fetch HR users
  const fetchHRUsers = async () => {
    try {
      const result = await apiFetch(`${API}/users/hr`);
      if (result && result.data.success) {
        setHrUsers(result.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch HR users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHRUsers();
  }, []);

  useEffect(() => {
    if (!showModal) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [showModal]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddNew = () => {
    setFormData({ fullName: "", email: "" });
    setTempPassword("");
    setEmailSentTo({ sent: false, address: "" });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API}/users/hr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setTempPassword(data.data.tempPassword);
        setEmailSentTo({ sent: !!data.data.emailSent, address: data.data.email || formData.email });
        setShowPassword(true);
        fetchHRUsers();
      } else {
        alert(data.message || "Failed to create HR");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  const toggleStatus = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to change the status of this HR user?",
      )
    )
      return;

    try {
      const response = await fetch(`${API}/users/${id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        fetchHRUsers();
      } else {
        alert(data.message || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <AdminLayout
      title="HR Management"
      subtitle="Create and manage HR personnel."
    >
      {/* Actions Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search HR users..."
            className="pl-10 pr-4 py-2.5 bg-[var(--color-card)] border border-[var(--color-border-light)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent w-64 md:w-80 "
          />
          <svg
            className="w-5 h-5 text-[var(--color-text-muted)] absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-[#FCD34D] hover:bg-[#fbbf24] text-[var(--color-text-primary)] font-bold py-2.5 px-5 rounded-xl transition-all duration-200   flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          Add New HR
        </button>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-card)] rounded-2xl  border border-[var(--color-border)] overflow-hidden">
        <table className="min-w-full divide-y divide-[var(--color-border)]">
          <thead className="bg-[var(--color-surface)]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-[var(--color-text-muted)]">
                  Loading...
                </td>
              </tr>
            ) : hrUsers.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-[var(--color-text-muted)]">
                  No HR users found.
                </td>
              </tr>
            ) : (
              hrUsers.map((hr) => (
                <tr
                  key={hr._id}
                  className="hover:bg-[var(--color-surface)] transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-sm mr-4">
                        {hr.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="text-sm font-bold text-[var(--color-text-primary)]">
                        {hr.fullName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--color-text-secondary)]">{hr.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--color-text-muted)]">
                      {formatDate(hr.createdAt)}
                    </div>
                    {hr.createdBy && (
                      <div className="text-xs text-[var(--color-text-muted)]">
                        by {hr.createdBy.fullName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        hr.isActive
                          ? "bg-green-500/10 text-green-500 border border-green-500/20"
                          : "bg-red-500/10 text-red-500 border border-red-500/20"
                      }`}
                    >
                      {hr.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleStatus(hr._id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          hr.isActive
                            ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/15"
                            : "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/15"
                        }`}
                      >
                        {hr.isActive ? "Deactivate" : "Activate"}
                      </button>

                      {hr.mustChangePassword && (
                        <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-lg font-medium">
                          Pending Password Change
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create HR Modal */}
      {showModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
          style={{ overscrollBehavior: "contain" }}
        >
          <div
            className="bg-[var(--color-card)] rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-[var(--color-border)]"
            style={{ overscrollBehavior: "contain" }}
          >
            <div className="bg-[var(--color-surface)] px-8 py-6 border-b border-[var(--color-border)] flex justify-between items-center">
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                {showPassword ? "HR Created Successfully" : "Add New HR"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            {showPassword ? (
              /* Success State - Show Temp Password */
              <div className="p-8 space-y-6">
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    <p className="text-sm font-bold text-green-500">
                      HR account created!
                    </p>
                  </div>
                  <p className="text-xs text-green-500">
                    Login credentials have been prepared for the HR user.
                  </p>
                </div>

                {emailSentTo.sent ? (
                  <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-blue-400">Welcome email sent</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Credentials delivered to <span className="font-medium text-[var(--color-text-secondary)]">{emailSentTo.address}</span></p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                    <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-red-400">Email delivery failed</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Share the temporary password manually with the HR user.</p>
                    </div>
                  </div>
                )}

                <div className="bg-[var(--color-surface)] rounded-xl p-4">
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                    Temporary Password
                  </label>
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-mono font-bold text-[var(--color-text-primary)] bg-[var(--color-card)] px-4 py-2 rounded-lg border border-[var(--color-border-light)] flex-1 text-center select-all">
                      {tempPassword}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                        alert("Password copied to clipboard!");
                      }}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-3.5 bg-[#FCD34D] hover:bg-[#fbbf24] text-[var(--color-text-primary)] font-bold rounded-xl transition-all  hover:translate-y-[-1px]"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[var(--color-surface)] border-transparent focus:bg-[var(--color-card)] focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-[var(--color-text-primary)] text-sm font-medium transition-all"
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[var(--color-surface)] border-transparent focus:bg-[var(--color-card)] focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-[var(--color-text-primary)] text-sm font-medium transition-all"
                    placeholder="e.g. hr@company.com"
                    required
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs text-blue-500">
                    <span className="font-bold">Note:</span> A temporary
                    password will be auto-generated and credentials will be sent
                    to HR email (if mail is configured). HR must change password
                    on first login.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#FCD34D] hover:bg-[#fbbf24] text-[var(--color-text-primary)] font-bold rounded-xl transition-all  hover:translate-y-[-1px]"
                  >
                    Create HR Account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )}
    </AdminLayout>
  );
};

export default HRList;
