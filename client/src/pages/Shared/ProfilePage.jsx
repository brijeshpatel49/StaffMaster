import { useEffect, useState } from "react";
import { Trash2, Upload, Eye, EyeOff, CheckCircle } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../../hooks/useAuth";
import { getAvatarUrl } from "../../utils/avatarHelper";
import CustomDropdown from "../../components/CustomDropdown";
import { apiFetch } from "../../utils/api";

const ProfilePage = () => {
  const { updateUser, API } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    city: "",
    state: ""
  });
  
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [uploadLoading, setUploadLoading] = useState(false);

  // Security Form
  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState(null);

  const genderOptions = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Other", value: "other" }
  ];

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProfile = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await apiFetch(`${API}/profile/me`);
      if (!result) return;
      const { response, data: resData } = result;
      if (!response.ok) throw new Error("Failed to fetch profile");

      setProfileData(resData.data);
      if (resData?.data?.user) {
        updateUser({
          profilePhoto: resData.data.user.profilePhoto || null,
          gender: resData.data.user.gender,
          fullName: resData.data.user.fullName,
        });
      }
      
      const names = (resData.data.user.fullName || "").split(" ");
      const fName = names[0] || "";
      const lName = names.slice(1).join(" ") || "";

      setEditForm({
        firstName: fName,
        lastName: lName,
        email: resData.data.user.email || "",
        phone: resData.data.user.phone || "",
        dateOfBirth: resData.data.user.dateOfBirth ? resData.data.user.dateOfBirth.split("T")[0] : "",
        gender: resData.data.user.gender || "",
        city: resData.data.user.address?.city || "",
        state: resData.data.user.address?.state || ""
      });
    } catch (err) {
      setLoadError(err.message || "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleEditChange = (e) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        phone: editForm.phone,
        dateOfBirth: editForm.dateOfBirth || null,
        gender: editForm.gender,
        address: { city: editForm.city, state: editForm.state }
      };

      const result = await apiFetch(`${API}/profile/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!result) return;
      const { response, data: resData } = result;

      if (!response.ok) throw new Error(resData.message || "Error updating profile");

      if (resData?.data?.user) {
        updateUser({
          phone: resData.data.user.phone,
          dateOfBirth: resData.data.user.dateOfBirth,
          gender: resData.data.user.gender,
          address: resData.data.user.address,
        });
      }

      await fetchProfile();
      setIsEditing(false);
      showToast("Profile updated successfully!");
    } catch (err) {
      showToast(err.message || "Error updating profile", true);
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("File size must be under 5MB", true);
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const result = await apiFetch(`${API}/profile/me/photo`, {
        method: "PATCH",
        body: formData
      });
      if (!result) return;
      const { response, data: resData } = result;

      if (!response.ok) throw new Error(resData.message || "Error uploading photo");

      updateUser({ profilePhoto: resData.profilePhoto || null });

      setProfileData((prev) => ({
        ...prev,
        user: { ...prev.user, profilePhoto: resData.profilePhoto }
      }));
      showToast("Photo uploaded!");
    } catch (err) {
      showToast(err.message || "Error uploading photo", true);
    } finally {
      setUploadLoading(false);
      e.target.value = null; // reset input
    }
  };

  const handlePhotoDelete = async () => {
    if (!window.confirm("Are you sure you want to remove your photo?")) return;
    setUploadLoading(true);

    try {
      const result = await apiFetch(`${API}/profile/me/photo`, { method: "DELETE" });
      if (!result) return;
      const { response, data: resData } = result;

      if (!response.ok) throw new Error(resData.message || "Error removing photo");

      updateUser({ profilePhoto: null });

      setProfileData((prev) => ({
        ...prev,
        user: { ...prev.user, profilePhoto: null }
      }));
      showToast("Photo removed.");
    } catch (err) {
      showToast(err.message || "Error removing photo", true);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdFeedback(null);

    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdFeedback({
        isError: true,
        msg: "New password and confirm password do not match."
      });
      return;
    }

    setPwdLoading(true);
    try {
      const result = await apiFetch(`${API}/profile/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(pwdForm)
      });
      if (!result) return;
      const { response, data: resData } = result;

      if (!response.ok) throw new Error(resData.message || "Error changing password");

      setPwdFeedback({
        isError: false,
        msg: resData.message || "Password updated successfully."
      });
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwdFeedback({
        isError: true,
        msg: err.message || "Unable to update password. Please try again."
      });
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div style={skeletonLayout}>
           <div style={skeletonAvatar} />
           <div style={skeletonForm} />
        </div>
      </DashboardLayout>
    );
  }

  if (loadError || !profileData) {
    return (
      <DashboardLayout>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 0" }}>
          <div
            style={{
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fca5a5",
              borderRadius: 10,
              padding: "14px 16px"
            }}
          >
            {loadError || "Unable to load profile right now."}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "20px 0 32px" }}>
        
        {toast && (
          <div style={{ backgroundColor: toast.isError ? "#fef2f2" : "#f0fdf4", color: toast.isError ? "#991b1b" : "#166534", padding: "12px 16px", borderRadius: 8, marginBottom: 20, display: "flex", alignItems: "center", gap: 8, border: `1px solid ${toast.isError ? "#fca5a5" : "#86efac"}` }}>
            {toast.isError ? "!" : <CheckCircle size={16} />} {toast.msg}
          </div>
        )}

        <section style={sectionShellStyle}>
          {/* Top Header */}
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ margin: "0 0 6px 0", fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)" }}>Personal Information</h2>
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)" }}>Edit your personal informations</p>
          </div>

          {/* Avatar Upload Section */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, marginBottom: 22, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <img
                src={getAvatarUrl(profileData?.user, 120)}
                alt="Profile"
                style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", backgroundColor: "var(--color-page-bg)" }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/default_male.png";
                }}
              />
              
              <label style={{ ...yellowBtnStyle, cursor: uploadLoading ? "not-allowed" : "pointer", opacity: uploadLoading ? 0.7 : 1 }}>
                <Upload size={16} /> {uploadLoading ? "Uploading..." : "Upload An Image"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect} disabled={uploadLoading} />
              </label>

              {profileData?.user?.profilePhoto && (
                <button onClick={handlePhotoDelete} disabled={uploadLoading} style={deleteBtnStyle}>
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {!isEditing ? (
              <button type="button" onClick={() => setIsEditing(true)} style={editBtnStyle}>Edit Profile</button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  fetchProfile();
                }}
                style={cancelBtnStyle}
              >
                Cancel Editing
              </button>
            )}
          </div>

          {/* Form Container */}
          <form onSubmit={handleSaveProfile} style={formPanelStyle}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", columnGap: 20, rowGap: 18 }}>
            
            <InputField label="First name" name="firstName" value={editForm.firstName} onChange={handleEditChange} required readOnly={true} />
            <InputField label="Last name" name="lastName" value={editForm.lastName} onChange={handleEditChange} required readOnly={true} />
            
            <InputField label="Email" name="email" type="email" value={editForm.email} onChange={handleEditChange} required readOnly={true} />
            
            <div style={inputWrapper}>
              <label style={labelStyle}>Phone number<span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ display: "flex", backgroundColor: "var(--color-surface)", borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)", opacity: isEditing ? 1 : 0.7 }}>
                  <div style={{ padding: "12px 16px", backgroundColor: "var(--color-page-bg)", color: "var(--color-text-secondary)", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", borderRight: "1px solid var(--color-border)" }}>+91</div>
                 <input type="tel" name="phone" value={editForm.phone} onChange={handleEditChange} required disabled={!isEditing} style={{ ...inputBaseStyle, flex: 1, border: "none", borderRadius: 0 }} />
              </div>
            </div>

            <InputField label="Date of Birth" name="dateOfBirth" type="date" value={editForm.dateOfBirth} onChange={handleEditChange} disabled={!isEditing} />
            
            <div style={inputWrapper}>
              <label style={labelStyle}>Gender</label>
              {isEditing ? (
                <CustomDropdown
                  value={editForm.gender}
                  onChange={(value) => setEditForm((prev) => ({ ...prev, gender: value }))}
                  options={genderOptions}
                  placeholder="Select"
                  fullWidth
                  size="md"
                />
              ) : (
                <div
                  style={{
                    ...inputBaseStyle,
                    opacity: 0.68,
                    cursor: "default"
                  }}
                >
                  {genderOptions.find((item) => item.value === editForm.gender)?.label || "Select"}
                </div>
              )}
            </div>

            <InputField label="City" name="city" value={editForm.city} onChange={handleEditChange} disabled={!isEditing} />
            <InputField label="State" name="state" value={editForm.state} onChange={handleEditChange} disabled={!isEditing} />
            
          </div>

            {isEditing && (
              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={saving} style={{ ...saveBtnStyle, opacity: saving ? 0.65 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </form>
        </section>

        {/* Security Section Below */}
        <section style={sectionShellStyle}>
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ margin: "0 0 6px 0", fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)" }}>Security</h2>
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)" }}>Update your account password</p>
          </div>

          <form onSubmit={handleChangePassword} style={formPanelStyle}>
          {pwdFeedback && (
            <div
              role="alert"
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                borderRadius: 8,
                border: `1px solid ${pwdFeedback.isError ? "#fca5a5" : "#86efac"}`,
                backgroundColor: pwdFeedback.isError ? "#fef2f2" : "#f0fdf4",
                color: pwdFeedback.isError ? "#991b1b" : "#166534",
                fontSize: 14,
                fontWeight: 500
              }}
            >
              {pwdFeedback.msg}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            
            <div style={inputWrapper}>
              <label style={labelStyle}>Current Password<span style={{ color: "#ef4444" }}>*</span></label>
              <div style={{ position: "relative" }}>
                 <input type={showPwd ? "text" : "password"} name="currentPassword" value={pwdForm.currentPassword} onChange={(e) => setPwdForm({...pwdForm, currentPassword: e.target.value})} required style={inputBaseStyle} />
                 <button type="button" onClick={() => setShowPwd(!showPwd)} style={iconInsideInputStyle}>{showPwd ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>

            <div style={inputWrapper}>
              <label style={labelStyle}>New Password<span style={{ color: "#ef4444" }}>*</span></label>
              <div style={{ position: "relative" }}>
                 <input type={showPwd ? "text" : "password"} name="newPassword" value={pwdForm.newPassword} onChange={(e) => setPwdForm({...pwdForm, newPassword: e.target.value})} required style={inputBaseStyle} />
                 <button type="button" onClick={() => setShowPwd(!showPwd)} style={iconInsideInputStyle}>{showPwd ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>

            <div style={inputWrapper}>
              <label style={labelStyle}>Confirm Password<span style={{ color: "#ef4444" }}>*</span></label>
              <div style={{ position: "relative" }}>
                 <input type={showPwd ? "text" : "password"} name="confirmPassword" value={pwdForm.confirmPassword} onChange={(e) => setPwdForm({...pwdForm, confirmPassword: e.target.value})} required style={inputBaseStyle} />
              </div>
            </div>

          </div>
            <div style={{ marginTop: 20 }}>
              <button type="submit" disabled={pwdLoading || !pwdForm.newPassword} style={saveBtnStyle}>
                {pwdLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </section>

      </div>
    </DashboardLayout>
  );
};

// Reusable Input Component
const InputField = ({ label, required, ...props }) => (
  <div style={inputWrapper}>
    <label style={labelStyle}>
      {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
    </label>
    <input
      style={{
        ...inputBaseStyle,
        opacity: props.readOnly || props.disabled ? 0.68 : 1,
        cursor: props.readOnly || props.disabled ? "default" : "text"
      }}
      {...props}
    />
  </div>
);

// Styles
const yellowBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 20px",
  backgroundColor: "#fcd34d",
  color: "#111827",
  fontWeight: 600,
  fontSize: 15,
  borderRadius: 8,
  border: "none"
};

const deleteBtnStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  height: 44,
  backgroundColor: "var(--color-surface)",
  color: "#ef4444",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  cursor: "pointer"
};

const saveBtnStyle = {
  padding: "12px 28px",
  backgroundColor: "var(--color-accent)",
  color: "var(--color-accent-foreground, #111827)",
  fontWeight: 600,
  fontSize: 15,
  borderRadius: 8,
  border: "none",
  cursor: "pointer"
};

const editBtnStyle = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-surface)",
  color: "var(--color-text-primary)",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer"
};

const cancelBtnStyle = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "1px solid #fca5a5",
  backgroundColor: "transparent",
  color: "#ef4444",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer"
};

const sectionShellStyle = {
  marginBottom: 24,
  padding: 18,
  borderRadius: 18,
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-surface)"
};

const formPanelStyle = {
  backgroundColor: "var(--color-page-bg)",
  borderRadius: 16,
  border: "1px solid var(--color-border)",
  padding: 24,
  marginBottom: 30
};

const inputWrapper = {
  display: "flex",
  flexDirection: "column",
  gap: 8
};

const labelStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--color-text-secondary)"
};

const inputBaseStyle = {
  width: "100%",
  padding: "14px 16px",
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  outline: "none",
  fontSize: 15,
  color: "var(--color-text-primary)"
};

const iconInsideInputStyle = {
  position: "absolute",
  right: 14,
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  color: "#9ca3af",
  cursor: "pointer"
};

const skeletonLayout = {
  maxWidth: 900,
  margin: "0 auto",
  padding: "20px 0"
};

const skeletonAvatar = {
  width: 100,
  height: 100,
  borderRadius: "50%",
  backgroundColor: "var(--color-border)",
  marginBottom: 30
};

const skeletonForm = {
  height: 400,
  backgroundColor: "var(--color-page-bg)",
  borderRadius: 16,
  border: "1px solid var(--color-border)"
};

export default ProfilePage;
