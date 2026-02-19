import DashboardLayout from "../layouts/DashboardLayout";

/** Thin wrapper — keeps AdminLayout API intact for existing admin pages */
const AdminLayout = ({ children, title, subtitle }) => (
  <DashboardLayout title={title} subtitle={subtitle}>
    {children}
  </DashboardLayout>
);

export default AdminLayout;
