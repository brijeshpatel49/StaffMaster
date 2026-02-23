import { useState, useEffect } from "react";
import HRLayout from "../../../layouts/HRLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import DepartmentCard from "../../../components/departments/DepartmentCard";
import EmployeeDrawer from "../../../components/departments/EmployeeDrawer";

const HRDepartments = () => {
  const { API } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDept, setSelectedDept] = useState(null);
  const [deptEmployees, setDeptEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const result = await apiFetch(`${API}/departments`);
        if (result?.data?.success) {
          setDepartments(result.data.departments);
        }
      } catch (err) {
        console.error("Departments fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDepts();
  }, [API]);

  const handleViewEmployees = async (dept) => {
    setSelectedDept(dept);
    setDeptEmployees([]);
    setEmpLoading(true);
    try {
      const result = await apiFetch(
        `${API}/hr/dashboard/department/${dept._id}/employees`,
      );
      if (result?.data?.success) {
        setDeptEmployees(result.data.employees);
      }
    } catch (err) {
      console.error("Employees by dept error:", err);
    } finally {
      setEmpLoading(false);
    }
  };

  return (
    <HRLayout
      title="Departments"
      subtitle="Browse departments and their employees."
    >
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "100px 0",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid #fde68a",
              borderTop: "4px solid #f59e0b",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {departments.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: "14px" }}>
              No departments found.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "20px",
              }}
            >
              {departments.map((dept) => (
                <DepartmentCard
                  key={dept._id}
                  dept={dept}
                  onViewEmployees={handleViewEmployees}
                  isAdmin={false}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Shared employee slide-over */}
      {selectedDept && (
        <EmployeeDrawer
          dept={selectedDept}
          employees={deptEmployees}
          loading={empLoading}
          onClose={() => setSelectedDept(null)}
        />
      )}
    </HRLayout>
  );
};

export default HRDepartments;
