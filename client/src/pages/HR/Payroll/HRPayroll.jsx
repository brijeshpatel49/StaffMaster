import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Wallet,
  Download,
  ChevronDown,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  PlayCircle,
  RefreshCw,
  FileText,
  X,
  Users,
  Clock,
  BadgeCheck,
  CreditCard,
  Search,
  Edit3,
  Save,
  AlertCircle,
  CheckCircle,
  XCircle,
  ListChecks,
} from "lucide-react";
import HRLayout from "../../../layouts/HRLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";
import CustomDropdown from "../../../components/CustomDropdown";

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

export default function HRPayroll() {
  const { API, token } = useAuth();
  const [activeTab, setActiveTab] = useState("payroll");
  const [payrolls, setPayrolls] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Custom modal state
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
  const [alertModal, setAlertModal] = useState(null); // { title, message, type }

  const showConfirm = (title, message) =>
    new Promise((resolve) => {
      setConfirmModal({
        title,
        message,
        onConfirm: () => { setConfirmModal(null); resolve(true); },
        onCancel: () => { setConfirmModal(null); resolve(false); },
      });
    });

  const showAlert = (title, message, type = "success") =>
    new Promise((resolve) => {
      setAlertModal({ title, message, type, onClose: () => { setAlertModal(null); resolve(); } });
    });


  // Salary structure modal (single employee)
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    employeeId: "",
    ctc: "",
    effectiveFrom: "",
  });
  const [employees, setEmployees] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);

  // Salary Structures tab state
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [salaryStructuresLoading, setSalaryStructuresLoading] = useState(false);
  const [salarySearch, setSalarySearch] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("all"); // all | set | not-set
  const [editingId, setEditingId] = useState(null);
  const [editCtc, setEditCtc] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelections, setBulkSelections] = useState({}); // { employeeId: ctcValue }
  const [bulkEffectiveFrom, setBulkEffectiveFrom] = useState(
    new Date().toISOString().split("T")[0]
  );

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());


  const currentYear = now.getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  const fetchPayrolls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
      });
      const [payrollRes, summaryRes] = await Promise.all([
        apiFetch(`${API}/payroll/all?${params}`),
        apiFetch(`${API}/payroll/summary?${params}`),
      ]);
      if (payrollRes?.data?.success) setPayrolls(payrollRes.data.data);
      else setPayrolls([]);
      if (summaryRes?.data?.success) setSummary(summaryRes.data.data);
      else setSummary(null);
    } catch {
      setPayrolls([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [API, month, year]);

  const fetchEmployees = useCallback(async () => {
    try {
      const result = await apiFetch(`${API}/users`);
      if (result?.data?.success) {
        setEmployees(
          result.data.data.filter(
            (u) => u.role === "employee" || u.role === "manager"
          )
        );
      }
    } catch {
      // silently fail
    }
  }, [API]);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ── Salary Structures tab data ──
  const fetchSalaryStructures = useCallback(async () => {
    setSalaryStructuresLoading(true);
    try {
      const result = await apiFetch(`${API}/payroll/salary-structures`);
      if (result?.data?.success) setSalaryStructures(result.data.data);
      else setSalaryStructures([]);
    } catch {
      setSalaryStructures([]);
    } finally {
      setSalaryStructuresLoading(false);
    }
  }, [API]);

  useEffect(() => {
    if (activeTab === "salary") fetchSalaryStructures();
  }, [activeTab, fetchSalaryStructures]);


  const handleInlineSave = async (employeeId) => {
    if (!editCtc || Number(editCtc) <= 0) return;
    setSalaryLoading(true);
    try {
      const result = await apiFetch(`${API}/payroll/salary-structure`, {
        method: "POST",
        body: JSON.stringify({
          employeeId,
          ctc: Number(editCtc),
          effectiveFrom: new Date().toISOString().split("T")[0],
        }),
      });
      if (result?.data?.success) {
        setEditingId(null);
        setEditCtc("");
        fetchSalaryStructures();
      } else {
        await showAlert("Failed", result?.data?.message || "Failed to save", "error");
      }
    } catch {
      await showAlert("Error", "Error saving salary", "error");
    } finally {
      setSalaryLoading(false);
    }
  };

  const handleBulkSave = async () => {
    const entries = Object.entries(bulkSelections).filter(
      ([, ctc]) => ctc && Number(ctc) > 0
    );
    if (entries.length === 0) {
      await showAlert("No Selection", "No employees selected or CTC values entered", "error");
      return;
    }
    if (!bulkEffectiveFrom) {
      await showAlert("Missing Date", "Please set an effective date", "error");
      return;
    }
    const ok = await showConfirm(
      "Bulk Set Salary",
      `Set salary structure for ${entries.length} employee(s)?`
    );
    if (!ok) return;

    setSalaryLoading(true);
    setActionMessage("Saving salary structures...");
    try {
      const result = await apiFetch(`${API}/payroll/salary-structures/bulk`, {
        method: "POST",
        body: JSON.stringify({
          employees: entries.map(([employeeId, ctc]) => ({
            employeeId,
            ctc: Number(ctc),
          })),
          effectiveFrom: bulkEffectiveFrom,
        }),
      });
      setSalaryLoading(false);
      setActionMessage("");
      if (result?.data?.success) {
        await showAlert("Success", result.data.message, "success");
        setBulkMode(false);
        setBulkSelections({});
        fetchSalaryStructures();
      } else {
        await showAlert("Failed", result?.data?.message || "Failed", "error");
      }
    } catch {
      setSalaryLoading(false);
      setActionMessage("");
      await showAlert("Error", "Error saving salary structures", "error");
    }
  };

  const filteredSalary = salaryStructures.filter((e) => {
    const matchSearch =
      !salarySearch ||
      e.fullName?.toLowerCase().includes(salarySearch.toLowerCase()) ||
      e.email?.toLowerCase().includes(salarySearch.toLowerCase());
    const matchFilter =
      salaryFilter === "all" ||
      (salaryFilter === "set" && e.hasSalary) ||
      (salaryFilter === "not-set" && !e.hasSalary);
    return matchSearch && matchFilter;
  });

  // ── Actions ──

  const handleGenerate = async () => {
    const ok = await showConfirm(
      "Generate Payroll",
      `Generate payroll for ${MONTH_NAMES[month]} ${year}?`
    );
    if (!ok) return;
    setActionLoading(true);
    setActionMessage(`Generating payroll for ${MONTH_NAMES[month]} ${year}...`);
    try {
      const result = await apiFetch(`${API}/payroll/generate`, {
        method: "POST",
        body: JSON.stringify({ month, year }),
      });
      setActionLoading(false);
      setActionMessage("");
      if (result?.data?.success) {
        await showAlert(
          "Payroll Generated",
          `${result.data.message}\nGenerated: ${result.data.data.generated}, Skipped: ${result.data.data.skipped}`,
          "success"
        );
        fetchPayrolls();
      } else {
        await showAlert("Failed", result?.data?.message || "Failed to generate payroll", "error");
      }
    } catch {
      setActionLoading(false);
      setActionMessage("");
      await showAlert("Error", "Error generating payroll", "error");
    }
  };

  const handleRegenerate = async () => {
    const ok = await showConfirm(
      "Regenerate Payroll",
      `Regenerate payroll for ${MONTH_NAMES[month]} ${year}? This will recalculate all records.`
    );
    if (!ok) return;
    setActionLoading(true);
    setActionMessage(`Regenerating payroll for ${MONTH_NAMES[month]} ${year}...`);
    try {
      const result = await apiFetch(`${API}/payroll/regenerate`, {
        method: "POST",
        body: JSON.stringify({ month, year }),
      });
      setActionLoading(false);
      setActionMessage("");
      if (result?.data?.success) {
        await showAlert("Success", result.data.message, "success");
        fetchPayrolls();
      } else {
        await showAlert("Failed", result?.data?.message || "Failed to regenerate", "error");
      }
    } catch {
      setActionLoading(false);
      setActionMessage("");
      await showAlert("Error", "Error regenerating payroll", "error");
    }
  };

  
  const handleBulkApprove = async () => {
    const ok = await showConfirm(
      "Approve All",
      "Approve all draft payrolls for this month?"
    );
    if (!ok) return;
    setActionLoading(true);
    setActionMessage("Approving all draft payrolls...");
    try {
      const result = await apiFetch(`${API}/payroll/bulk-approve`, {
        method: "PATCH",
        body: JSON.stringify({ month, year }),
      });
      setActionLoading(false);
      setActionMessage("");
      if (result?.data?.success) {
        await showAlert("Success", result.data.message, "success");
        fetchPayrolls();
      }
    } catch {
      setActionLoading(false);
      setActionMessage("");
      await showAlert("Error", "Error approving payrolls", "error");
    }
  };

  const handleBulkPay = async () => {
    const ok = await showConfirm(
      "Mark All Paid",
      "Mark all approved payrolls as paid? Employees will be emailed."
    );
    if (!ok) return;
    setActionLoading(true);
    setActionMessage("Processing payments & sending emails...");
    try {
      const result = await apiFetch(`${API}/payroll/bulk-pay`, {
        method: "PATCH",
        body: JSON.stringify({ month, year }),
      });
      setActionLoading(false);
      setActionMessage("");
      if (result?.data?.success) {
        await showAlert("Success", result.data.message, "success");
        fetchPayrolls();
      }
    } catch {
      setActionLoading(false);
      setActionMessage("");
      await showAlert("Error", "Error marking payrolls as paid", "error");
    }
  };

  const handleApproveOne = async (id) => {
    setActionLoading(true);
    setActionMessage("Approving...");
    try {
      const result = await apiFetch(`${API}/payroll/${id}/approve`, {
        method: "PATCH",
      });
      if (result?.data?.success) fetchPayrolls();
    } catch {
      await showAlert("Error", "Error approving", "error");
    } finally {
      setActionLoading(false);
      setActionMessage("");
    }
  };

  const handlePayOne = async (id) => {
    setActionLoading(true);
    setActionMessage("Processing payment...");
    try {
      const result = await apiFetch(`${API}/payroll/${id}/mark-paid`, {
        method: "PATCH",
      });
      if (result?.data?.success) fetchPayrolls();
    } catch {
      await showAlert("Error", "Error marking paid", "error");
    } finally {
      setActionLoading(false);
      setActionMessage("");
    }
  };

  const handleDownload = async (id, empName, mo, yr) => {
    try {
      const response = await fetch(`${API}/payroll/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Payslip_${empName?.replace(/\s+/g, "_") || "emp"}_${MONTH_NAMES[mo]}_${yr}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // download failed
    }
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    if (!salaryForm.employeeId || !salaryForm.ctc || !salaryForm.effectiveFrom)
      return;
    setSalaryLoading(true);
    setActionMessage("Saving salary structure...");
    try {
      const result = await apiFetch(`${API}/payroll/salary-structure`, {
        method: "POST",
        body: JSON.stringify({
          employeeId: salaryForm.employeeId,
          ctc: Number(salaryForm.ctc),
          effectiveFrom: salaryForm.effectiveFrom,
        }),
      });
      setSalaryLoading(false);
      setActionMessage("");
      if (result?.data?.success) {
        await showAlert("Success", "Salary structure saved!", "success");
        setShowSalaryModal(false);
        setSalaryForm({ employeeId: "", ctc: "", effectiveFrom: "" });
      } else {
        await showAlert("Failed", result?.data?.message || "Failed to save", "error");
      }
    } catch {
      setSalaryLoading(false);
      setActionMessage("");
      await showAlert("Error", "Error saving salary structure", "error");
    }
  };

  // ── Filter ──
  const filtered = payrolls.filter((p) => {
    const matchSearch =
      !search ||
      (p.employeeId?.fullName || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (p.employeeId?.email || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading && activeTab === "payroll") {
    return (
      <HRLayout title="Payroll Management" subtitle="Manage employee payroll">
        <Loader />
      </HRLayout>
    );
  }

  return (
    <HRLayout title="Payroll Management" subtitle="Manage employee payroll">
      <div className="space-y-6">
        {/* ── Tabs ── */}
        <div
          className="flex gap-1 p-1 rounded-xl w-fit"
          style={{ backgroundColor: "var(--color-page-bg)", border: "1px solid var(--color-border)" }}
        >
          <button
            onClick={() => setActiveTab("payroll")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none transition-colors"
            style={{
              backgroundColor: activeTab === "payroll" ? "var(--color-accent)" : "transparent",
              color: activeTab === "payroll" ? "#fff" : "var(--color-text-muted)",
            }}
          >
            <Wallet size={16} />
            Payroll
          </button>
          <button
            onClick={() => setActiveTab("salary")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none transition-colors"
            style={{
              backgroundColor: activeTab === "salary" ? "var(--color-accent)" : "transparent",
              color: activeTab === "salary" ? "#fff" : "var(--color-text-muted)",
            }}
          >
            <IndianRupee size={16} />
            Salary Structures
          </button>
        </div>

        {activeTab === "payroll" ? (
          <PayrollTab
            summary={summary}
            month={month}
            setMonth={setMonth}
            year={year}
            setYear={setYear}
            years={years}
            actionLoading={actionLoading}
            handleGenerate={handleGenerate}
            handleRegenerate={handleRegenerate}
            handleBulkApprove={handleBulkApprove}
            handleBulkPay={handleBulkPay}
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            filtered={filtered}
            payrolls={payrolls}
            handleApproveOne={handleApproveOne}
            handlePayOne={handlePayOne}
            handleDownload={handleDownload}
            setShowSalaryModal={setShowSalaryModal}
            setActiveTab={setActiveTab}
          />
        ) : (
          <SalaryStructuresTab
            loading={salaryStructuresLoading}
            data={filteredSalary}
            allData={salaryStructures}
            search={salarySearch}
            setSearch={setSalarySearch}
            filter={salaryFilter}
            setFilter={setSalaryFilter}
            editingId={editingId}
            setEditingId={setEditingId}
            editCtc={editCtc}
            setEditCtc={setEditCtc}
            handleInlineSave={handleInlineSave}
            salaryLoading={salaryLoading}
            bulkMode={bulkMode}
            setBulkMode={setBulkMode}
            bulkSelections={bulkSelections}
            setBulkSelections={setBulkSelections}
            bulkEffectiveFrom={bulkEffectiveFrom}
            setBulkEffectiveFrom={setBulkEffectiveFrom}
            handleBulkSave={handleBulkSave}
          />
        )}
      </div>

      {/* ── Salary Structure Modal ── */}
      {showSalaryModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowSalaryModal(false)}
        >
          <div
            className="rounded-2xl w-full max-w-md p-6"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3
                className="text-lg font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Set Salary Structure
              </h3>
              <button
                onClick={() => setShowSalaryModal(false)}
                className="p-1 rounded-lg cursor-pointer border-none"
                style={{
                  backgroundColor: "var(--color-page-bg)",
                  color: "var(--color-text-muted)",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSalary} className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Employee
                </label>
                <CustomDropdown
                  value={salaryForm.employeeId}
                  onChange={(val) =>
                    setSalaryForm((f) => ({ ...f, employeeId: val }))
                  }
                  placeholder="Select employee"
                  fullWidth
                  size="md"
                  options={employees.map((emp) => ({
                    value: emp._id,
                    label: `${emp.fullName} (${emp.email})`,
                  }))}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Annual CTC (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={salaryForm.ctc}
                  onChange={(e) =>
                    setSalaryForm((f) => ({ ...f, ctc: e.target.value }))
                  }
                  required
                  placeholder="e.g. 600000"
                  className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none"
                  style={{
                    backgroundColor: "var(--color-page-bg)",
                    color: "var(--color-text-primary)",
                    borderColor: "var(--color-border)",
                  }}
                />
                {salaryForm.ctc && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Monthly gross: {fmtCurrency(Math.round(Number(salaryForm.ctc) / 12))}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Effective From
                </label>
                <input
                  type="date"
                  value={salaryForm.effectiveFrom}
                  onChange={(e) =>
                    setSalaryForm((f) => ({
                      ...f,
                      effectiveFrom: e.target.value,
                    }))
                  }
                  required
                  className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none"
                  style={{
                    backgroundColor: "var(--color-page-bg)",
                    color: "var(--color-text-primary)",
                    borderColor: "var(--color-border)",
                  }}
                />
              </div>

              {salaryForm.ctc && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: "var(--color-page-bg)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p
                    className="text-xs font-semibold mb-2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    AUTO-CALCULATED BREAKDOWN
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <BreakdownItem
                      label="Basic (40%)"
                      value={fmtCurrency(Math.round(Number(salaryForm.ctc) * 0.4))}
                    />
                    <BreakdownItem
                      label="HRA (20%)"
                      value={fmtCurrency(Math.round(Number(salaryForm.ctc) * 0.2))}
                    />
                    <BreakdownItem
                      label="DA (10%)"
                      value={fmtCurrency(Math.round(Number(salaryForm.ctc) * 0.1))}
                    />
                    <BreakdownItem
                      label="Special"
                      value={fmtCurrency(
                        Number(salaryForm.ctc) -
                          Math.round(Number(salaryForm.ctc) * 0.4) -
                          Math.round(Number(salaryForm.ctc) * 0.2) -
                          Math.round(Number(salaryForm.ctc) * 0.1)
                      )}
                    />
                    <BreakdownItem
                      label="PF (12% of Basic)"
                      value={fmtCurrency(
                        Math.round(Number(salaryForm.ctc) * 0.4 * 0.12)
                      )}
                    />
                    <BreakdownItem
                      label="Tax (10%)"
                      value={fmtCurrency(Math.round(Number(salaryForm.ctc) * 0.1))}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={salaryLoading}
                className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer border-none disabled:opacity-50"
                style={{ backgroundColor: "#f59e0b", color: "#fff" }}
              >
                {salaryLoading ? "Saving..." : "Save Salary Structure"}
              </button>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Loading Overlay + Confirm + Alert portaled to body */}
      {createPortal(
        <>
          {/* Loading Overlay */}
          {actionLoading && actionMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="flex flex-col items-center gap-4 rounded-2xl px-10 py-8 shadow-2xl"
            style={{ backgroundColor: "var(--color-card)", color: "var(--color-text-primary)" }}
          >
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
            <p className="text-lg font-medium">{actionMessage}</p>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="mx-4 w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ backgroundColor: "var(--color-card)", color: "var(--color-text-primary)" }}
          >
            <h3 className="mb-2 text-lg font-bold">{confirmModal.title}</h3>
            <p className="mb-6 whitespace-pre-line" style={{ color: "var(--color-text-secondary)" }}>
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={confirmModal.onCancel}
                className="rounded-lg px-5 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: "var(--color-accent)" }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="mx-4 w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ backgroundColor: "var(--color-card)", color: "var(--color-text-primary)" }}
          >
            <div className="mb-4 flex items-center gap-3">
              {alertModal.type === "success" && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-icon-green-bg)", color: "var(--color-icon-green)" }}>
                  <CheckCircle size={22} />
                </div>
              )}
              {alertModal.type === "error" && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-icon-red-bg)", color: "var(--color-icon-red)" }}>
                  <XCircle size={22} />
                </div>
              )}
              {alertModal.type === "info" && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-icon-blue-bg)", color: "var(--color-icon-blue)" }}>
                  <AlertCircle size={22} />
                </div>
              )}
              <h3 className="text-lg font-bold">{alertModal.title}</h3>
            </div>
            <p className="mb-6 whitespace-pre-line" style={{ color: "var(--color-text-secondary)" }}>
              {alertModal.message}
            </p>
            <div className="flex justify-end">
              <button
                onClick={alertModal.onClose}
                className="rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors"
                style={{
                  backgroundColor:
                    alertModal.type === "success"
                      ? "var(--color-positive)"
                      : alertModal.type === "error"
                      ? "var(--color-negative)"
                      : "var(--color-accent)",
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
        </>,
        document.body
      )}
    </HRLayout>
  );
}

// ── PayrollTab ────────────────────────────────────────────────────────────

function PayrollTab({
  summary,
  month,
  setMonth,
  year,
  setYear,
  years,
  actionLoading,
  handleGenerate,
  handleRegenerate,
  handleBulkApprove,
  handleBulkPay,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  filtered,
  payrolls,
  handleApproveOne,
  handlePayOne,
  handleDownload,
  setShowSalaryModal,
  setActiveTab,
}) {
  return (
    <>
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon={Users} label="Total Records" value={summary.total} color="#6366f1" />
          <SummaryCard icon={TrendingUp} label="Total Gross" value={fmtCurrency(summary.totalGross)} color="#2563eb" />
          <SummaryCard icon={TrendingDown} label="Total Deductions" value={fmtCurrency(summary.totalDeductions)} color="#dc2626" />
          <SummaryCard icon={IndianRupee} label="Total Net" value={fmtCurrency(summary.totalNet)} color="#16a34a" />
        </div>
      )}

      {/* Status pills */}
      {summary && (
        <div className="flex items-center gap-3 flex-wrap">
          <StatusPill label="Draft" count={summary.draft} color="#f59e0b" />
          <StatusPill label="Approved" count={summary.approved} color="#2563eb" />
          <StatusPill label="Paid" count={summary.paid} color="#16a34a" />
        </div>
      )}

      {/* Controls */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <CustomDropdown
            value={month}
            onChange={(val) => setMonth(Number(val))}
            options={MONTH_NAMES.slice(1).map((m, i) => ({ value: i + 1, label: m }))}
            minWidth={140}
          />
          <CustomDropdown
            value={year}
            onChange={(val) => setYear(Number(val))}
            options={years.map((y) => ({ value: y, label: String(y) }))}
            minWidth={100}
          />

          <div className="flex-1" />

          <button
            onClick={() => setActiveTab("salary")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border-none"
            style={{ backgroundColor: "#6366f1", color: "#fff" }}
          >
            <IndianRupee size={16} />
            Manage Salaries
          </button>
          <button
            onClick={handleGenerate}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border-none disabled:opacity-50"
            style={{ backgroundColor: "#16a34a", color: "#fff" }}
          >
            <PlayCircle size={16} />
            Generate
          </button>
          <button
            onClick={handleRegenerate}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border-none disabled:opacity-50"
            style={{ backgroundColor: "#f59e0b", color: "#fff" }}
          >
            <RefreshCw size={16} />
            Regenerate
          </button>
          <button
            onClick={handleBulkApprove}
            disabled={actionLoading || !summary?.draft}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border-none disabled:opacity-50"
            style={{ backgroundColor: "#2563eb", color: "#fff" }}
          >
            <BadgeCheck size={16} />
            Approve All
          </button>
          <button
            onClick={handleBulkPay}
            disabled={actionLoading || !summary?.approved}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border-none disabled:opacity-50"
            style={{ backgroundColor: "#7c3aed", color: "#fff" }}
          >
            <CreditCard size={16} />
            Pay All
          </button>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl pl-9 pr-4 py-2 text-sm border outline-none"
            style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", borderColor: "var(--color-border)" }}
          />
        </div>
        <div className="flex gap-2">
          {["all", "draft", "approved", "paid"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none capitalize"
              style={{
                backgroundColor: statusFilter === s ? "var(--color-accent)" : "var(--color-surface)",
                color: statusFilter === s ? "#fff" : "var(--color-text-muted)",
                border: statusFilter === s ? "none" : "1px solid var(--color-border)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Payroll Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={40} className="mx-auto mb-3" style={{ color: "var(--color-text-muted)", opacity: 0.4 }} />
            <p style={{ color: "var(--color-text-muted)" }}>
              {payrolls.length === 0
                ? `No payroll generated for ${MONTH_NAMES[month]} ${year}. Click "Generate" to start.`
                : "No matching records"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "var(--color-page-bg)", color: "var(--color-text-muted)" }}>
                  <th className="text-left px-5 py-3 font-semibold">Employee</th>
                  <th className="text-right px-5 py-3 font-semibold">Gross</th>
                  <th className="text-right px-5 py-3 font-semibold">Deductions</th>
                  <th className="text-right px-5 py-3 font-semibold">Net Salary</th>
                  <th className="text-center px-5 py-3 font-semibold">Days</th>
                  <th className="text-center px-5 py-3 font-semibold">Status</th>
                  <th className="text-center px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const st = STATUS_STYLES[p.status] || STATUS_STYLES.draft;
                  return (
                    <tr key={p._id} style={{ borderTop: "1px solid var(--color-border)" }}>
                      <td className="px-5 py-3">
                        <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{p.employeeId?.fullName || "—"}</p>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{p.employeeId?.email || ""}</p>
                      </td>
                      <td className="px-5 py-3 text-right" style={{ color: "var(--color-text-secondary)" }}>{fmtCurrency(p.grossEarnings)}</td>
                      <td className="px-5 py-3 text-right" style={{ color: "#dc2626" }}>-{fmtCurrency(p.totalDeductions)}</td>
                      <td className="px-5 py-3 text-right font-bold" style={{ color: "var(--color-text-primary)" }}>{fmtCurrency(p.netSalary)}</td>
                      <td className="px-5 py-3 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {p.presentDays}/{p.totalWorkingDays}
                        {p.isProRated && <span className="ml-1 text-[10px]" style={{ color: "#f59e0b" }}>(pro)</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: st.bg, color: st.text }}>{st.label}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {p.status === "draft" && (
                            <button onClick={() => handleApproveOne(p._id)} disabled={actionLoading} className="p-1.5 rounded-lg cursor-pointer border-none disabled:opacity-50" style={{ backgroundColor: "#dbeafe", color: "#2563eb" }} title="Approve"><BadgeCheck size={14} /></button>
                          )}
                          {p.status === "approved" && (
                            <button onClick={() => handlePayOne(p._id)} disabled={actionLoading} className="p-1.5 rounded-lg cursor-pointer border-none disabled:opacity-50" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }} title="Mark Paid"><CreditCard size={14} /></button>
                          )}
                          <button
                            onClick={() => handleDownload(p._id, p.employeeId?.fullName, p.month, p.year)}
                            className="p-1.5 rounded-lg cursor-pointer border-none"
                            style={{ backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)" }}
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── SalaryStructuresTab ──────────────────────────────────────────────────

function SalaryStructuresTab({
  loading,
  data,
  allData,
  search,
  setSearch,
  filter,
  setFilter,
  editingId,
  setEditingId,
  editCtc,
  setEditCtc,
  handleInlineSave,
  salaryLoading,
  bulkMode,
  setBulkMode,
  bulkSelections,
  setBulkSelections,
  bulkEffectiveFrom,
  setBulkEffectiveFrom,
  handleBulkSave,
}) {
  const setCount = allData.filter((e) => e.hasSalary).length;
  const notSetCount = allData.filter((e) => !e.hasSalary).length;

  if (loading) return <Loader />;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard icon={Users} label="Total Employees" value={allData.length} color="#6366f1" />
        <SummaryCard icon={CheckCircle2} label="Salary Set" value={setCount} color="#16a34a" />
        <SummaryCard icon={AlertCircle} label="Not Set" value={notSetCount} color="#dc2626" />
      </div>

      {notSetCount > 0 && (
        <div
          className="flex items-center gap-3 rounded-xl p-4"
          style={{ backgroundColor: "#fef3c7", border: "1px solid #fbbf24" }}
        >
          <AlertCircle size={18} style={{ color: "#d97706" }} />
          <p className="text-sm font-medium" style={{ color: "#92400e" }}>
            {notSetCount} employee(s) don't have salary structures set. Set them before generating payroll.
          </p>
        </div>
      )}

      {/* Controls */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl pl-9 pr-4 py-2 text-sm border outline-none"
              style={{ backgroundColor: "var(--color-page-bg)", color: "var(--color-text-primary)", borderColor: "var(--color-border)" }}
            />
          </div>

          <div className="flex gap-2">
            {[
              { key: "all", label: "All" },
              { key: "set", label: "Set" },
              { key: "not-set", label: "Not Set" },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setFilter(s.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none"
                style={{
                  backgroundColor: filter === s.key ? "var(--color-accent)" : "var(--color-surface)",
                  color: filter === s.key ? "#fff" : "var(--color-text-muted)",
                  border: filter === s.key ? "none" : "1px solid var(--color-border)",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setBulkMode(!bulkMode);
              setBulkSelections({});
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border-none"
            style={{
              backgroundColor: bulkMode ? "#dc2626" : "#6366f1",
              color: "#fff",
            }}
          >
            <ListChecks size={16} />
            {bulkMode ? "Cancel Bulk" : "Bulk Set"}
          </button>
        </div>

        {/* Bulk mode controls */}
        {bulkMode && (
          <div
            className="mt-4 flex items-center gap-3 p-4 rounded-xl flex-wrap"
            style={{ backgroundColor: "var(--color-page-bg)", border: "1px solid var(--color-border)" }}
          >
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
                Effective From
              </label>
              <input
                type="date"
                value={bulkEffectiveFrom}
                onChange={(e) => setBulkEffectiveFrom(e.target.value)}
                className="rounded-lg px-3 py-1.5 text-sm border outline-none"
                style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", borderColor: "var(--color-border)" }}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {Object.values(bulkSelections).filter((v) => v && Number(v) > 0).length} employee(s) selected
            </p>
            <div className="flex-1" />
            <button
              onClick={handleBulkSave}
              disabled={salaryLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer border-none disabled:opacity-50"
              style={{ backgroundColor: "#16a34a", color: "#fff" }}
            >
              <Save size={16} />
              {salaryLoading ? "Saving..." : "Save All"}
            </button>
          </div>
        )}
      </div>

      {/* Salary Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        {data.length === 0 ? (
          <div className="p-8 text-center">
            <Users size={40} className="mx-auto mb-3" style={{ color: "var(--color-text-muted)", opacity: 0.4 }} />
            <p style={{ color: "var(--color-text-muted)" }}>No employees found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "var(--color-page-bg)", color: "var(--color-text-muted)" }}>
                  <th className="text-left px-5 py-3 font-semibold">Employee</th>
                  <th className="text-left px-5 py-3 font-semibold">Designation</th>
                  <th className="text-center px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Annual CTC</th>
                  <th className="text-right px-5 py-3 font-semibold">Monthly Gross</th>
                  {!bulkMode && <th className="text-center px-5 py-3 font-semibold">Action</th>}
                  {bulkMode && <th className="text-right px-5 py-3 font-semibold">Set CTC</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((emp) => (
                  <tr
                    key={emp._id}
                    style={{
                      borderTop: "1px solid var(--color-border)",
                      backgroundColor: !emp.hasSalary ? "rgba(239,68,68,0.04)" : "transparent",
                    }}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{emp.fullName}</p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{emp.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {emp.designation || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: emp.hasSalary ? "#dcfce7" : "#fef2f2",
                          color: emp.hasSalary ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {emp.hasSalary ? "Set" : "Not Set"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {editingId === emp._id ? (
                        <input
                          type="number"
                          min="0"
                          value={editCtc}
                          onChange={(e) => setEditCtc(e.target.value)}
                          autoFocus
                          className="w-32 rounded-lg px-3 py-1.5 text-sm text-right border outline-none"
                          style={{ backgroundColor: "var(--color-page-bg)", color: "var(--color-text-primary)", borderColor: "var(--color-accent)" }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleInlineSave(emp._id);
                            if (e.key === "Escape") { setEditingId(null); setEditCtc(""); }
                          }}
                        />
                      ) : (
                        emp.hasSalary ? fmtCurrency(emp.ctc) : "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-right" style={{ color: "var(--color-text-muted)" }}>
                      {emp.hasSalary ? fmtCurrency(Math.round(emp.ctc / 12)) : "—"}
                    </td>
                    {!bulkMode && (
                      <td className="px-5 py-3 text-center">
                        {editingId === emp._id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleInlineSave(emp._id)}
                              disabled={salaryLoading}
                              className="p-1.5 rounded-lg cursor-pointer border-none disabled:opacity-50"
                              style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}
                              title="Save"
                            >
                              <Save size={14} />
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setEditCtc(""); }}
                              className="p-1.5 rounded-lg cursor-pointer border-none"
                              style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingId(emp._id); setEditCtc(emp.ctc || ""); }}
                            className="p-1.5 rounded-lg cursor-pointer border-none"
                            style={{ backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)" }}
                            title={emp.hasSalary ? "Edit CTC" : "Set CTC"}
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                      </td>
                    )}
                    {bulkMode && (
                      <td className="px-5 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          placeholder={emp.ctc ? String(emp.ctc) : "Enter CTC"}
                          value={bulkSelections[emp._id] || ""}
                          onChange={(e) =>
                            setBulkSelections((prev) => ({
                              ...prev,
                              [emp._id]: e.target.value,
                            }))
                          }
                          className="w-32 rounded-lg px-3 py-1.5 text-sm text-right border outline-none"
                          style={{ backgroundColor: "var(--color-page-bg)", color: "var(--color-text-primary)", borderColor: "var(--color-border)" }}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function SummaryCard({ icon: Icon, label, value, color }) {
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
    </div>
  );
}

function StatusPill({ label, count, color }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: `${color}15`, color }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}: {count}
    </div>
  );
}

function BreakdownItem({ label, value }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
      <span
        className="font-semibold"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}
