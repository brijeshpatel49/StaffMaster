import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import departmentRoutes from "./routes/DepartmentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import employeeRoutes from "./routes/EmployeeRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import hrDashboardRoutes from "./routes/hrDashboardRoutes.js";
import managerDashboardRoutes from "./routes/managerDashboardRoutes.js";
import employeeDashboardRoutes from "./routes/employeeDashboardRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import holidayRoutes from "./routes/holidayRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import performanceRoutes from "./routes/performanceRoutes.js";
import payrollRoutes from "./routes/payrollRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import cronRoutes from "./routes/cronRoutes.js";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-vercel-cron"],
  }),
);

connectDB();

const port = process.env.PORT || 4949;

app.get("/", (req, res) => {
  res.send("API Working");
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/departments", departmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/hr/dashboard", hrDashboardRoutes);
app.use("/api/manager", managerDashboardRoutes);
app.use("/api/employee", employeeDashboardRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/cron", cronRoutes);

app.listen(port, () => {
  console.log("Server running on port ", port);
});
