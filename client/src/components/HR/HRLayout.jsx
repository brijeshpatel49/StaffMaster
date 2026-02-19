import DashboardLayout from "../layouts/DashboardLayout";

/** HR-specific layout — wraps the shared DashboardLayout */
const HRLayout = ({ children, title, subtitle }) => (
  <DashboardLayout title={title} subtitle={subtitle}>
    {children}
  </DashboardLayout>
);

export default HRLayout;
