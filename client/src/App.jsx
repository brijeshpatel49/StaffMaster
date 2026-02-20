import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

// Admin pages
import AdminDashboard from "./pages/Admin/AdminDashboard";
import HRList from "./pages/Admin/HR/HRList";
import EmployeeList from "./pages/Admin/Employees/EmployeeList";

// HR pages
import HRDashboard from "./pages/HR/HRDashboard";
import HRDepartments from "./pages/HR/Departments/HRDepartments";

// Shared pages
import ChangePassword from "./pages/ChangePassword";
import DepartmentList from "./pages/Admin/Departments/DepartmentList";

// ── Route guard helpers ───────────────────────────────────────────────────────

/** Admin-only route */
const AdminRoute = ({ children }) => (
  <ProtectedRoute>
    <RoleRoute allowedRoles={["admin"]}>{children}</RoleRoute>
  </ProtectedRoute>
);

/** HR-only route (also lets admin in for convenience) */
const HRRoute = ({ children }) => (
  <ProtectedRoute>
    <RoleRoute allowedRoles={["hr"]}>{children}</RoleRoute>
  </ProtectedRoute>
);

// ─────────────────────────────────────────────────────────────────────────────

function App() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* ── Shared protected ── */}
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      {/* ── Admin routes (/admin/*) ── */}
      <Route path="/admin">
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="departments"
          element={
            <AdminRoute>
              <DepartmentList />
            </AdminRoute>
          }
        />
        <Route
          path="hr"
          element={
            <AdminRoute>
              <HRList />
            </AdminRoute>
          }
        />
        <Route
          path="employees"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin", "hr"]}>
                <EmployeeList />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* ── HR routes (/hr/*) ── */}
      <Route path="/hr">
        <Route index element={<Navigate to="/hr/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <HRRoute>
              <HRDashboard />
            </HRRoute>
          }
        />
        <Route
          path="departments"
          element={
            <HRRoute>
              <HRDepartments />
            </HRRoute>
          }
        />
        <Route
          path="employees"
          element={
            <HRRoute>
              <EmployeeList />
            </HRRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* ── Global 404 ── */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
