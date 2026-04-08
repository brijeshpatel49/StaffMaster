import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Download,
  Calendar,
  ChevronDown,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
} from "lucide-react";
import EmployeeLayout from "../../../layouts/EmployeeLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const fmtCurrency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const STATUS_STYLES = {
  draft: { bg: "var(--color-accent-bg)", text: "var(--color-text-muted)", label: "Draft" },
  approved: { bg: "#dbeafe", text: "#2563eb", label: "Approved" },
  paid: { bg: "#dcfce7", text: "#16a34a", label: "Paid" },
};


export default function EmployeePayroll() {
  const { API, token } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [payrollRes, latestRes] = await Promise.all([
        apiFetch(`${API}/payroll/my`),
        apiFetch(`${API}/payroll/my/latest`),
      ]);
      if (payrollRes?.data?.success) setPayrolls(payrollRes.data.data);
      if (latestRes?.data?.success) setLatest(latestRes.data.data);
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
  }, [API]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = payrolls.filter((p) => p.year === yearFilter);

  const handleDownload = async (id, month, year) => {
    try {
      const response = await fetch(`${API}/payroll/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Payslip_${MONTH_NAMES[month]}_${year}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // download failed silently
    }
  };


  if (loading) {
    return (
      <EmployeeLayout title="Payroll" subtitle="View your salary details">
        <Loader />
      </EmployeeLayout>
    );
  }

  
  return (
    <EmployeeLayout title="Payroll" subtitle="View your salary details">
      <div className="space-y-6">
        {/* ── Summary Cards ── */}
        {latest && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={IndianRupee}
              label="Net Salary"
              value={fmtCurrency(latest.netSalary)}
              sub={`${MONTH_NAMES[latest.month]} ${latest.year}`}
              color="#16a34a"
            />
            <SummaryCard
              icon={TrendingUp}
              label="Gross Earnings"
              value={fmtCurrency(latest.grossEarnings)}
              sub="Latest month"
              color="#2563eb"
            />
            <SummaryCard
              icon={TrendingDown}
              label="Deductions"
              value={fmtCurrency(latest.totalDeductions)}
              sub="Latest month"
              color="#dc2626"
            />
            <SummaryCard
              icon={Clock}
              label="Working Days"
              value={latest.presentDays}
              sub={`of ${latest.totalWorkingDays} days`}
              color="#f59e0b"
            />
          </div>
        )}

        {/* ── Latest Payslip Card ── */}
        {latest && (
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-lg font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Latest Payslip
              </h3>
              {(latest.status === "approved" || latest.status === "paid") && (
                <button
                  onClick={() => handleDownload(latest._id, latest.month, latest.year)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border-none"
                  style={{
                    backgroundColor: "#f59e0b",
                    color: "#fff",
                  }}
                >
                  <Download size={16} />
                  Download PDF
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <DetailItem label="Basic" value={fmtCurrency(latest.basic)} />
              <DetailItem label="HRA" value={fmtCurrency(latest.hra)} />
              <DetailItem label="DA" value={fmtCurrency(latest.da)} />
              <DetailItem label="Special" value={fmtCurrency(latest.special)} />
              <DetailItem label="PF" value={fmtCurrency(latest.pf)} negative />
              <DetailItem label="Tax" value={fmtCurrency(latest.tax)} negative />
              <DetailItem
                label="Late Deduction"
                value={fmtCurrency(latest.lateDeduction)}
                negative
              />
              <DetailItem
                label="Leave Deduction"
                value={fmtCurrency(latest.leaveDeduction)}
                negative
              />
            </div>

            {latest.isProRated && (
              <p
                className="mt-3 text-xs"
                style={{ color: "#f59e0b" }}
              >
                * Pro-rated salary — effective working days: {latest.proRateDays}
              </p>
            )}
          </div>
        )}

        {/* ── History Table ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between p-5">
            <h3
              className="text-lg font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Payroll History
            </h3>
            <div className="relative">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(Number(e.target.value))}
                className="appearance-none rounded-xl px-4 py-2 pr-8 text-sm font-medium cursor-pointer border"
                style={{
                  backgroundColor: "var(--color-page-bg)",
                  color: "var(--color-text-primary)",
                  borderColor: "var(--color-border)",
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--color-text-muted)" }}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <FileText
                size={40}
                className="mx-auto mb-3"
                style={{ color: "var(--color-text-muted)", opacity: 0.4 }}
              />
              <p style={{ color: "var(--color-text-muted)" }}>
                No payroll records for {yearFilter}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      backgroundColor: "var(--color-page-bg)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <th className="text-left px-5 py-3 font-semibold">Month</th>
                    <th className="text-right px-5 py-3 font-semibold">Gross</th>
                    <th className="text-right px-5 py-3 font-semibold">Deductions</th>
                    <th className="text-right px-5 py-3 font-semibold">Net Salary</th>
                    <th className="text-center px-5 py-3 font-semibold">Status</th>
                    <th className="text-center px-5 py-3 font-semibold">Payslip</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const st = STATUS_STYLES[p.status] || STATUS_STYLES.draft;
                    return (
                      <tr
                        key={p._id}
                        style={{
                          borderTop: "1px solid var(--color-border)",
                        }}
                      >
                        <td
                          className="px-5 py-3 font-medium"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {MONTH_NAMES[p.month]} {p.year}
                        </td>
                        <td
                          className="px-5 py-3 text-right"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {fmtCurrency(p.grossEarnings)}
                        </td>
                        <td
                          className="px-5 py-3 text-right"
                          style={{ color: "#dc2626" }}
                        >
                          -{fmtCurrency(p.totalDeductions)}
                        </td>
                        <td
                          className="px-5 py-3 text-right font-bold"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {fmtCurrency(p.netSalary)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: st.bg,
                              color: st.text,
                            }}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {(p.status === "approved" || p.status === "paid") ? (
                            <button
                              onClick={() =>
                                handleDownload(p._id, p.month, p.year)
                              }
                              className="p-2 rounded-lg cursor-pointer border-none"
                              style={{
                                backgroundColor: "var(--color-accent-bg)",
                                color: "var(--color-accent)",
                              }}
                              title="Download Payslip"
                            >
                              <Download size={16} />
                            </button>
                          ) : (
                            <span
                              className="text-xs"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </EmployeeLayout>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon size={20} />
        </div>
        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </span>
      </div>
      <p
        className="text-xl font-bold"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
        {sub}
      </p>
    </div>
  );
}

function DetailItem({ label, value, negative }) {
  return (
    <div>
      <p
        className="text-xs mb-1"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </p>
      <p
        className="text-sm font-bold"
        style={{ color: negative ? "#dc2626" : "var(--color-text-primary)" }}
      >
        {negative ? `-${value}` : value}
      </p>
    </div>
  );
}
