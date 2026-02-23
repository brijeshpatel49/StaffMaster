// src/layouts/EmployeeLayout.jsx

import DashboardLayout from "./DashboardLayout";

/** Employee-specific layout — wraps the shared DashboardLayout */
const EmployeeLayout = ({ children, title, subtitle }) => (
  <DashboardLayout title={title} subtitle={subtitle}>
    {children}
  </DashboardLayout>
);

export default EmployeeLayout;
