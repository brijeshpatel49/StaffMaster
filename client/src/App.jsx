import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import DepartmentList from "./pages/Admin/Departments/DepartmentList";
import HRList from "./pages/Admin/HR/HRList";
import EmployeeList from "./pages/Admin/Employees/EmployeeList";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* Protected Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/departments"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <DepartmentList />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/hr"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <HRList />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin", "hr"]}>
              <EmployeeList />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
