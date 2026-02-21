import DashboardLayout from "../layouts/DashboardLayout";

/** Manager-specific layout — wraps the shared DashboardLayout */
const ManagerLayout = ({ children, title, subtitle }) => (
  <DashboardLayout title={title} subtitle={subtitle}>
    {children}
  </DashboardLayout>
);

export default ManagerLayout;
