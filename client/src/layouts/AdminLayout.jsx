// src/layouts/AdminLayout.jsx

import DashboardLayout from "./DashboardLayout";

/** Thin wrapper — keeps AdminLayout API intact for admin pages */
const AdminLayout = ({ children, title, subtitle }) => (
  <DashboardLayout title={title} subtitle={subtitle}>
    {children}
  </DashboardLayout>
);

export default AdminLayout;
