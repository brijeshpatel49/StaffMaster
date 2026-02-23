// src/pages/Admin/AdminDashboard.jsx

import { useState, useEffect } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Users,
  Building2,
  UserCog,
  Briefcase,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const AdminDashboard = () => {
  const { API, token } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    totalManagers: 0,
    totalHR: 0,
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
      if (result.success) setStats(result.data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      id: 1,
      title: "Total Employee",
      value: stats.totalEmployees,
      change: "+12.04%",
      positive: true,
      changeLabel: "Last month",
      icon: Users,
    },
    {
      id: 2,
      title: "Total Departments",
      value: stats.totalDepartments,
      change: "+32.00%",
      positive: true,
      changeLabel: "Last month",
      icon: Building2,
    },
    {
      id: 3,
      title: "Total Managers",
      value: stats.totalManagers,
      change: "+16.22%",
      positive: true,
      changeLabel: "Last month",
      icon: UserCog,
    },
    {
      id: 4,
      title: "Total HR",
      value: stats.totalHR,
      change: "-8.06%",
      positive: false,
      changeLabel: "Last month",
      icon: Briefcase,
    },
  ];

  if (loading) {
    return (
      <AdminLayout title="Dashboard" subtitle="Overview of your organization.">
        <div className="flex items-center justify-center h-64">
          <div
            className="w-10 h-10 rounded-full border-[3px] animate-spin"
            style={{
              borderColor: "var(--color-border)",
              borderTopColor: "var(--color-accent)",
            }}
          />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard" subtitle="Overview of your organization.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className="rounded-2xl p-5 transition-all duration-200 cursor-default"
              style={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              {/* Title */}
              <p
                className="text-xs font-medium mb-3"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {stat.title}
              </p>

              {/* Big number — Brightly style */}
              <p
                className="text-4xl font-bold tracking-tight leading-none mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                {stat.value}
              </p>

              {/* Change % + label — inline like Brightly */}
              <div className="flex items-center gap-1.5">
                <span
                  className="flex items-center gap-0.5 text-xs font-semibold"
                  style={{
                    color: stat.positive
                      ? "var(--color-positive)"
                      : "var(--color-negative)",
                  }}
                >
                  {stat.positive ? (
                    <TrendingUp size={11} />
                  ) : (
                    <TrendingDown size={11} />
                  )}
                  {stat.change}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {stat.changeLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
