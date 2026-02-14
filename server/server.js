import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./config/db.js";
import authRouter from "./routes/userRoutes.js";
import departmentRoutes from "./routes/DepartmentRoutes.js";

import employeeRoutes from "./routes/EmployeeRoutes.js";

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
app.use("/api/users", employeeRoutes);

app.listen(port, () => {
  console.log("Server running on port ", port);
});
