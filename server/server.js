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

const app = express();

app.use(express.json());
app.use(cors());

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

app.listen(port, () => {
  console.log("Server running on port ", port);
});
