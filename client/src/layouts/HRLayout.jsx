// src/layouts/HRLayout.jsx

import DashboardLayout from "./DashboardLayout";

/** HR-specific layout — wraps the shared DashboardLayout */
const HRLayout = ({ children, title, subtitle }) => (
  <DashboardLayout title={title} subtitle={subtitle}>
    {children}
  </DashboardLayout>
);

export default HRLayout;
