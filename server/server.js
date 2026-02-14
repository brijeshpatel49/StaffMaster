import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./config/db.js";
import userRouter from "./routes/userRoutes.js"

const app = express();

app.use(express.json());
app.use(cors());

connectDB();

const port = process.env.PORT || 4949;

app.get("/", (req, res) => {
  res.send("API Working");
});
app.use("/api",userRouter)

app.listen(port, () => {
  console.log("Server running on port ", port);
});
