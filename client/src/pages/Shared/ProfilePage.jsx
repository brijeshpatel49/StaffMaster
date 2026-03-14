import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getAvatarUrl } from "../../utils/avatarHelper";
import { Camera, Lock, Eye, EyeOff, Edit2, X, CheckCircle, Upload, Trash2 } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

// Get role badge colors
const getRoleBadge = (role) => {
  const roleColors = {
    admin: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", label: "Admin" },
    hr: { bg: "rgba(139,92,246,0.1)", color: "#8b5cf6", label: "HR" },
    manager: { bg: "rgba(59,130,246,0.1)", color: "#3b82f6", label: "Manager" },
    employee: { bg: "rgba(34,197,94,0.1)", color: "#22c55e", label: "Employee" }
  };
  return roleColors[role] || { bg: "var(--color-border)", color: "var(--color-text-secondary)", label: role };
};

const getEmpTypeBadge = (type) => {
  const types = {
    "Full-time": { bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
    "Part-time": { bg: "rgba(245,158,11,0.1)", color: "#f59e0b" },
    "Contract": { bg: "rgba(59,130,246,0.1)", color: "#3b82f6" },
  };
  return types[type] || { bg: "var(--color-border)", color: "var(--color-text-secondary)" };
};

const getCompletion = (user, profile) => {
  const fields = [
    { key: 'phone', val: user?.phone, name: "phone number" },
    { key: 'dateOfBirth', val: user?.dateOfBirth, name: "date of birth" },
    { key: 'gender', val: user?.gender, name: "gender" },
    { key: 'city', val: user?.address?.city, name: "city" },
    { key: 'profilePhoto', val: user?.profilePhoto, name: "profile photo" },
    { key: 'designation', val: profile?.designation, name: "designation" }
  ];
  
  const filled = fields.filter(f => Boolean(f.val)).length;
  const nextMissing = fields.find(f => !f.val);
  
  return {
    percentage: Math.round((filled / fields.length) * 100),
    missingHint: nextMissing ? `Add ${nextMissing.name} to complete` : "Profile is complete 🎉"
  };
};

const getStrength = (pwd) => {
  if (!pwd) return 0;
  if (pwd.length < 8) return 1; // weak
  const hasLetters = /[A-Za-z]/.test(pwd);
  const hasNumbers = /\d/.test(pwd);
  const hasSpecials = /[^A-Za-z0-9]/.test(pwd);
  
  if (hasLetters && hasNumbers && !hasSpecials) return 2; // medium
  if (hasLetters && hasNumbers && hasSpecials) return 3; // strong
  return 1;
};

const TabButton = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "12px 20px",
      borderBottom: active ? "2px solid var(--color-accent)" : "2px solid transparent",
      color: active ? "var(--color-text-primary)" : "var(--color-text-muted)",
      fontWeight: active ? 600 : 500,
      backgroundColor: "transparent",
      cursor: "pointer",
      borderTop: 'none', borderLeft: 'none', borderRight: 'none',
      outline: 'none',
      transition: "all 0.2s"
    }}
  >
    {label}
  </button>
);

const ProfilePage = () => {
  const { user, login } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Security Tab
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Photo modal
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await fetch("http://localhost:4949/api/profile/me", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch profile");
      const resData = await response.json();
      
      setProfileData(resData.data);
      setEditForm({
        phone: resData.data.user.phone || "",
        dateOfBirth: resData.data.user.dateOfBirth ? resData.data.user.dateOfBirth.split('T')[0] : "",
        gender: resData.data.user.gender || "",
        city: resData.data.user.address?.city || "",
        state: resData.data.user.address?.state || ""
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleEditChange = (e) => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
      
      const response = await fetch("http://localhost:4949/api/profile/me", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });
      
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message || "Error updating profile");
      
      // Update local user state so avatar/header updates
      login(resData.data, localStorage.getItem("token"));
      
      await fetchProfile(); // refresh remaining data
      setIsEditing(false);
      showToast("Profile updated successfully!");
    } catch (err) {
      showToast(err.message || "Error updating profile", true);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdLoading(true);
    try {
      const response = await fetch("http://localhost:4949/api/profile/change-password", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(pwdForm)
      });
      
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message || "Error changing password");

      showToast(resData.message);
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      if(profileData?.user) profileData.user.mustChangePassword = false;
    } catch (err) {
      showToast(err.message || "Error changing password", true);
    } finally {
      setPwdLoading(false);
    }
  };

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const maxDob = new Date(Date.now() - 18*365*24*60*60*1000).toISOString().split('T')[0];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return showToast("File size must be under 5MB", true);
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedFile) return;
    setUploadLoading(true);
    const formData = new FormData();
    formData.append("photo", selectedFile);
    
    try {
      const response = await fetch("http://localhost:4949/api/profile/me/photo", {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });
      
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message || "Error uploading photo");
      
      const updatedUser = { ...user, profilePhoto: resData.profilePhoto };
      login(updatedUser, localStorage.getItem("token"));
      setProfileData(prev => ({...prev, user: updatedUser}));
      setPhotoModalOpen(false);
      showToast("Photo uploaded!");
    } catch (err) {
      showToast(err.message || "Error uploading photo", true);
    } finally {
      setUploadLoading(false);
      setSelectedFile(null);
      setPhotoPreview(null);
    }
  };

  const handlePhotoDelete = async () => {
    if(!window.confirm("Are you sure you want to remove your photo?")) return;
    setUploadLoading(true);
    try {
      const response = await fetch("http://localhost:4949/api/profile/me/photo", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message || "Error removing photo");

      const updatedUser = { ...user, profilePhoto: null };
      login(updatedUser, localStorage.getItem("token"));
      setProfileData(prev => ({...prev, user: updatedUser}));
      setPhotoModalOpen(false);
      showToast("Photo removed.");
    } catch (err) {
      showToast(err.message || "Error removing photo", true);
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading profile...</div>;

  const { user: profileUser, employeeProfile, department, reportingTo, leaveBalance, attendanceSummary } = profileData;
  const completion = getCompletion(profileUser, employeeProfile);
  const badge = getRoleBadge(profileUser.role);

  return (
    <DashboardLayout title="My Profile" subtitle="Manage your personal information and security">
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 24, paddingBottom: 40, flexDirection: window.innerWidth < 768 ? "column" : "row" }}>
      
      {/* LEFT STICKY CARD */}
      <div style={{ width: window.innerWidth < 768 ? "100%" : 280, flexShrink: 0 }}>
        <div style={{
          backgroundColor: "var(--color-card)",
          borderRadius: 16,
          padding: 24,
          border: "1px solid var(--color-border)",
          position: "sticky",
          top: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          
          <div 
            style={{ position: "relative", width: 96, height: 96, borderRadius: "50%", marginBottom: 16, cursor: "pointer", overflow: "hidden" }}
            onClick={() => {
              setPhotoPreview(getAvatarUrl(profileUser, 150));
              setPhotoModalOpen(true);
            }}
            onMouseEnter={(e) => { e.currentTarget.lastChild.style.opacity = 1; }}
            onMouseLeave={(e) => { e.currentTarget.lastChild.style.opacity = 0; }}
          >
            <img src={getAvatarUrl(user, 96)} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{
              position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", 
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              color: "white", opacity: 0, transition: "opacity 0.2s"
            }}>
              <Camera size={20} />
              <span style={{ fontSize: 10, marginTop: 4 }}>Change Photo</span>
            </div>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px 0", color: "var(--color-text-primary)" }}>{profileUser.fullName}</h2>
          
          <div style={{ 
            backgroundColor: badge.bg, color: badge.color, padding: "4px 12px", 
            borderRadius: 999, fontSize: 12, fontWeight: 600, marginBottom: 16 
          }}>
            {badge.label}
          </div>

          {employeeProfile?.designation && (
            <div style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 4 }}>{employeeProfile.designation}</div>
          )}
          {department?.name && (
            <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 16 }}>{department.name}</div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 24 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: profileUser.isActive ? "#22c55e" : "#ef4444" }}></div>
            <span style={{ color: "var(--color-text-secondary)" }}>{profileUser.isActive ? "Active" : "Inactive"}</span>
          </div>

          {/* Completion Bar */}
          <div style={{ width: "100%", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>Profile Completion</span>
              <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{completion.percentage}%</span>
            </div>
            <div style={{ height: 6, backgroundColor: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${completion.percentage}%`, backgroundColor: "var(--color-accent)", borderRadius: 3 }}></div>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 6, textAlign: "center" }}>
              {completion.missingHint}
            </div>
          </div>

          <div style={{ width: "100%", borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
            <InfoRow icon="📧" label={profileUser.email} />
            <InfoRow icon="📱" label={profileUser.phone || "—"} />
            <InfoRow icon="🗓" label={employeeProfile?.joiningDate ? new Date(employeeProfile.joiningDate).toLocaleDateString() : "—"} />
            <InfoRow icon="⏰" label={profileUser.lastLogin ? new Date(profileUser.lastLogin).toLocaleDateString() : "—"} />
          </div>

          {leaveBalance && (
            <div style={{ width: "100%", borderTop: "1px solid var(--color-border)", paddingTop: 16, marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 12 }}>Leave Balance</div>
              <div style={{ display: "flex", gap: 8 }}>
                <MiniLeaveCard title="Casual" count={leaveBalance.casual} />
                <MiniLeaveCard title="Sick" count={leaveBalance.sick} />
                <MiniLeaveCard title="Annual" count={leaveBalance.annual} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, minWidth: 0 }}>
        
        {toast && (
          <div style={{
            padding: "12px 16px", backgroundColor: toast.isError ? "#fef2f2" : "#f0fdf4",
            color: toast.isError ? "#991b1b" : "#166534", border: `1px solid ${toast.isError ? "#f87171" : "#86efac"}`,
            borderRadius: 8, marginBottom: 20, display: "flex", alignItems: "center", gap: 8
          }}>
            {toast.isError ? "⚠️" : <CheckCircle size={18} />}
            {toast.msg}
          </div>
        )}

        {profileUser.mustChangePassword && activeTab !== "security" && (
          <div style={{
            backgroundColor: "var(--color-accent-bg)",
            border: "1px solid var(--color-accent-border)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            gap: 10,
            alignItems: "center",
            color: "var(--color-accent)"
          }}>
            ⚠️ Please update your temporary password in the Security tab.
          </div>
        )}

        <div style={{ 
          backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", 
          borderRadius: 16, overflow: "hidden" 
        }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", padding: "0 20px" }}>
            <TabButton active={activeTab === "personal"} label="Personal Info" onClick={() => setActiveTab("personal")} />
            <TabButton active={activeTab === "work"} label="Work Info" onClick={() => setActiveTab("work")} />
            <TabButton active={activeTab === "security"} label="Security" onClick={() => setActiveTab("security")} />
          </div>

          <div style={{ padding: 24 }}>
            
            {/* TAB: PERSONAL */}
            {activeTab === "personal" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <h3 style={{ margin: 0, fontSize: 18, color: "var(--color-text-primary)" }}>Personal Information</h3>
                  {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", 
                      backgroundColor: "var(--color-page-bg)", border: "1px solid var(--color-border)",
                      borderRadius: 6, cursor: "pointer", color: "var(--color-text-primary)", fontSize: 14
                    }}>
                      <Edit2 size={14} /> Edit
                    </button>
                  ) : null}
                </div>

                {isEditing ? (
                  <form onSubmit={handleSaveProfile}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <Field label="Full Name" value={profileUser.fullName} disabled icon={<Lock size={14}/>} />
                      <Field label="Email" value={profileUser.email} disabled icon={<Lock size={14}/>} />
                      
                      <Field label="Phone" name="phone" type="tel" value={editForm.phone} onChange={handleEditChange} placeholder="10 digit mobile" />
                      <Field label="Date of Birth" name="dateOfBirth" type="date" value={editForm.dateOfBirth} onChange={handleEditChange} max={maxDob} />
                      
                      <div>
                        <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>Gender</label>
                        <select name="gender" value={editForm.gender} onChange={handleEditChange} style={inputStyle}>
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <Field label="City" name="city" value={editForm.city} onChange={handleEditChange} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <Field label="State" name="state" value={editForm.state} onChange={handleEditChange} />
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 16 }}>
                      🔒 To change your name or email, please contact HR.
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
                      <button type="button" onClick={() => setIsEditing(false)} style={{
                        padding: "8px 16px", backgroundColor: "transparent", border: "1px solid var(--color-border)",
                        borderRadius: 6, cursor: "pointer", color: "var(--color-text-primary)"
                      }}>Cancel</button>
                      <button type="submit" disabled={saving} style={{
                        padding: "8px 16px", backgroundColor: "var(--color-accent)", border: "none",
                        borderRadius: 6, cursor: "pointer", color: "#fff", fontWeight: 500
                      }}>{saving ? "Saving..." : "Save Changes"}</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                      <ViewField label="Full Name" value={profileUser.fullName} locked />
                      <ViewField label="Email" value={profileUser.email} locked />
                      <ViewField label="Phone" value={profileUser.phone || "—"} />
                      <ViewField label="Date of Birth" value={profileUser.dateOfBirth ? new Date(profileUser.dateOfBirth).toLocaleDateString() : "—"} />
                      <ViewField label="Gender" value={profileUser.gender ? profileUser.gender.charAt(0).toUpperCase() + profileUser.gender.slice(1) : "—"} />
                      <ViewField label="Location" value={[profileUser.address?.city, profileUser.address?.state].filter(Boolean).join(", ") || "—"} />
                    </div>

                    {completion.percentage < 100 && (
                      <div style={{ 
                        marginTop: 24, padding: "12px 16px", backgroundColor: "var(--color-page-bg)", 
                        borderLeft: "4px solid var(--color-accent)", borderRadius: "0 8px 8px 0",
                        fontSize: 14, color: "var(--color-text-secondary)"
                      }}>
                        💡 Complete your profile — add missing information to keep your records up to date.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB: WORK */}
            {activeTab === "work" && (
              <div>
                {!employeeProfile ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
                    You are a system administrator. Check the admin dashboard for system controls.
                  </div>
                ) : (
                  <>
                    <h3 style={{ margin: "0 0 20px 0", fontSize: 16, color: "var(--color-text-primary)" }}>Employment Details</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
                      <ViewField label="Department" value={department?.name || "—"} />
                      <ViewField label="Designation" value={employeeProfile.designation || "—"} />
                      
                      <div>
                        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Employment Type</div>
                        {employeeProfile.employmentType ? (
                          <span style={{
                            padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500,
                            ...getEmpTypeBadge(employeeProfile.employmentType)
                          }}>
                            {employeeProfile.employmentType}
                          </span>
                        ) : "—"}
                      </div>
                      
                      <ViewField label="Joining Date" value={employeeProfile.joiningDate ? new Date(employeeProfile.joiningDate).toLocaleDateString() : "—"} />
                      <ViewField label="Reporting To" value={reportingTo || "—"} />
                      <ViewField label="Role" value={getRoleBadge(profileUser.role).label} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                      <div>
                        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: "var(--color-text-primary)" }}>This Month Attendance</h3>
                        <div style={{ 
                          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, 
                          backgroundColor: "var(--color-page-bg)", padding: 16, borderRadius: 12 
                        }}>
                          <StatBox label="Present" val={attendanceSummary.present} color="#22c55e" />
                          <StatBox label="Late" val={attendanceSummary.late} color="#f59e0b" />
                          <StatBox label="Absent" val={attendanceSummary.absent} color="#ef4444" />
                          <StatBox label="Half Day" val={attendanceSummary.halfDay} color="#3b82f6" />
                          <StatBox label="On Leave" val={attendanceSummary.onLeave} color="#8b5cf6" />
                        </div>
                      </div>

                      {leaveBalance && (
                        <div>
                          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: "var(--color-text-primary)" }}>Leave Balance {new Date().getFullYear()}</h3>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <LeaveCard type="Casual" remaining={leaveBalance.casual} total={12} color="#3b82f6" />
                            <LeaveCard type="Sick" remaining={leaveBalance.sick} total={12} color="#ef4444" />
                            <LeaveCard type="Annual" remaining={leaveBalance.annual} total={15} color="#8b5cf6" />
                            <LeaveCard type="Unpaid" count={`${leaveBalance.unpaid} days used`} color="#f59e0b" />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: SECURITY */}
            {activeTab === "security" && (
              <div style={{ maxWidth: 480 }}>
                <h3 style={{ margin: "0 0 24px 0", fontSize: 18, color: "var(--color-text-primary)" }}>Change Password</h3>
                
                <form onSubmit={handleChangePassword}>
                  <PwdField label="Current Password" name="currentPassword" value={pwdForm.currentPassword} 
                    onChange={e => setPwdForm({...pwdForm, currentPassword: e.target.value})} show={showPwd} toggle={() => setShowPwd(!showPwd)} />
                  
                  <PwdField label="New Password" name="newPassword" value={pwdForm.newPassword} 
                    onChange={e => setPwdForm({...pwdForm, newPassword: e.target.value})} show={showPwd} toggle={() => setShowPwd(!showPwd)} />
                  
                  {/* Strength Bar */}
                  {pwdForm.newPassword && (
                    <div style={{ marginTop: -10, marginBottom: 20 }}>
                      <div style={{ display: "flex", gap: 4, height: 4, marginBottom: 6 }}>
                        <div style={{ flex: 1, backgroundColor: getStrength(pwdForm.newPassword) >= 1 ? (getStrength(pwdForm.newPassword) === 1 ? "#ef4444" : getStrength(pwdForm.newPassword) === 2 ? "#f59e0b" : "#22c55e") : "var(--color-border)", borderRadius: 2 }} />
                        <div style={{ flex: 1, backgroundColor: getStrength(pwdForm.newPassword) >= 2 ? (getStrength(pwdForm.newPassword) === 2 ? "#f59e0b" : "#22c55e") : "var(--color-border)", borderRadius: 2 }} />
                        <div style={{ flex: 1, backgroundColor: getStrength(pwdForm.newPassword) >= 3 ? "#22c55e" : "var(--color-border)", borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", textAlign: "right" }}>
                        {getStrength(pwdForm.newPassword) === 1 ? "Weak" : getStrength(pwdForm.newPassword) === 2 ? "Medium" : "Strong"}
                      </div>
                    </div>
                  )}

                  <PwdField label="Confirm New Password" name="confirmPassword" value={pwdForm.confirmPassword} 
                    onChange={e => setPwdForm({...pwdForm, confirmPassword: e.target.value})} show={showPwd} toggle={() => setShowPwd(!showPwd)} />

                  <button type="submit" disabled={pwdLoading || !pwdForm.currentPassword || !pwdForm.newPassword} style={{
                    padding: "10px 20px", width: "100%", backgroundColor: "var(--color-accent)", border: "none",
                    borderRadius: 8, cursor: "pointer", color: "#fff", fontWeight: 600, marginTop: 8
                  }}>{pwdLoading ? "Updating..." : "Update Password"}</button>
                </form>

                <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--color-border)", fontSize: 12, color: "var(--color-text-muted)" }}>
                  Last login: {profileUser.lastLogin ? new Date(profileUser.lastLogin).toLocaleString() : "Never"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PHOTO UPLOAD MODAL */}
      {photoModalOpen && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 99999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            backgroundColor: "var(--color-surface)", width: "100%", maxWidth: 400,
            borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Update Profile Photo</h3>
              <button onClick={() => { setPhotoModalOpen(false); setSelectedFile(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <img src={photoPreview || getAvatarUrl(user, 150)} alt="Preview" style={{
                width: 150, height: 150, borderRadius: "50%", objectFit: "cover",
                border: "4px solid var(--color-page-bg)", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", marginBottom: 24
              }} />

              <label style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                backgroundColor: "var(--color-accent)", color: "#fff", borderRadius: 8,
                cursor: "pointer", fontWeight: 500, marginBottom: 8
              }}>
                <Upload size={18} /> Choose Photo
                <input type="file" accept="image/jpeg, image/png, image/webp" style={{ display: "none" }} onChange={handleFileSelect} />
              </label>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 24 }}>JPG, PNG, WEBP • Max 5MB</div>

              <div style={{ display: "flex", width: "100%", gap: 12 }}>
                {user.profilePhoto && (
                  <button onClick={handlePhotoDelete} disabled={uploadLoading} style={{
                    flex: 1, padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    backgroundColor: "transparent", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 8, cursor: "pointer"
                  }}>
                    <Trash2 size={16} /> Remove
                  </button>
                )}
                <button onClick={handlePhotoUpload} disabled={!selectedFile || uploadLoading} style={{
                  flex: selectedFile ? 2 : 1, padding: "10px", backgroundColor: selectedFile ? "var(--color-accent)" : "var(--color-border)",
                  color: selectedFile ? "#fff" : "var(--color-text-muted)", border: "none", borderRadius: 8, cursor: selectedFile ? "pointer" : "not-allowed", fontWeight: 500
                }}>
                  {uploadLoading ? "Uploading..." : "Upload Photo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </DashboardLayout>
  );
};

// Sub-components
const InfoRow = ({ icon, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
    <span style={{ fontSize: 16 }}>{icon}</span> {label}
  </div>
);

const MiniLeaveCard = ({ title, count }) => (
  <div style={{ flex: 1, padding: "8px 4px", textAlign: "center", backgroundColor: "var(--color-page-bg)", borderRadius: 8 }}>
    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 2 }}>{title}</div>
    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{count}</div>
  </div>
);

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid var(--color-border)", backgroundColor: "var(--color-page-bg)",
  color: "var(--color-text-primary)", fontSize: 14, outline: "none"
};

const Field = ({ label, icon, ...props }) => (
  <div>
    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>
      {label} {icon}
    </label>
    <input style={{...inputStyle, opacity: props.disabled ? 0.6 : 1, cursor: props.disabled ? 'not-allowed' : 'text'}} {...props} />
  </div>
);

const ViewField = ({ label, value, locked }) => (
  <div>
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
      {label} {locked && <Lock size={12} />}
    </div>
    <div style={{ fontSize: 15, color: "var(--color-text-primary)", fontWeight: 500 }}>{value}</div>
  </div>
);

const StatBox = ({ label, val, color }) => (
  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--color-border-light)" }}>
    <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 600, color }}>{val}</span>
  </div>
);

const LeaveCard = ({ type, remaining, total, count, color }) => (
  <div style={{ border: `1px solid var(--color-border)`, borderRadius: 8, padding: 12 }}>
    <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8 }}>{type}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      {count ? (
        <span style={{ fontSize: 16, fontWeight: 600, color }}>{count}</span>
      ) : (
        <>
          <span style={{ fontSize: 20, fontWeight: 700, color }}>{remaining}</span>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>/ {total} rem.</span>
        </>
      )}
    </div>
  </div>
);

const PwdField = ({ label, name, value, onChange, show, toggle }) => (
  <div style={{ marginBottom: 16, position: "relative" }}>
    <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>{label}</label>
    <div style={{ position: "relative" }}>
      <input 
        type={show ? "text" : "password"} name={name} value={value} onChange={onChange}
        style={{...inputStyle, paddingRight: 40}} required
      />
      <button type="button" onClick={toggle} style={{
        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)"
      }}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  </div>
);

export default ProfilePage;
