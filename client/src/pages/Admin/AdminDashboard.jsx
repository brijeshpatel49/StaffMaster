import { useState, useEffect } from "react";
import AdminLayout from "../../components/Admin/AdminLayout";
import { Users, Building2, UserCog, Briefcase, TrendingUp } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const AdminDashboard = () => {
  const { API, token } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    totalManagers: 0,
    totalHR: 0,
    activeUsers: 0,
    inactiveUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${API}/admin/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      id: 1,
      title: "Total Employees",
      value: stats.totalEmployees,
      change: "+12%",
      icon: Users,
      color: "bg-blue-50",
      iconColor: "text-blue-600",
      changeColor: "text-green-600",
    },
    {
      id: 2,
      title: "Total Departments",
      value: stats.totalDepartments,
      change: "+2",
      icon: Building2,
      color: "bg-purple-50",
      iconColor: "text-purple-600",
      changeColor: "text-green-600",
    },
    {
      id: 3,
      title: "Total Managers",
      value: stats.totalManagers,
      change: "+3",
      icon: UserCog,
      color: "bg-yellow-50",
      iconColor: "text-yellow-600",
      changeColor: "text-green-600",
    },
    {
      id: 4,
      title: "Total HR",
      value: stats.totalHR,
      change: "0",
      icon: Briefcase,
      color: "bg-green-50",
      iconColor: "text-green-600",
      changeColor: "text-gray-600",
    },
  ];

  if (loading) {
    return (
      <AdminLayout title="Dashboard" subtitle="Overview of your organization.">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard" subtitle="Overview of your organization.">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.id}
              className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center`}
                >
                  <Icon className={stat.iconColor} size={24} />
                </div>
                {stat.change !== "0" && (
                  <div
                    className={`flex items-center gap-1 ${stat.changeColor} text-sm font-medium`}
                  >
                    <TrendingUp size={16} />
                    <span>{stat.change}</span>
                  </div>
                )}
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">
                {stat.title}
              </h3>
              <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
