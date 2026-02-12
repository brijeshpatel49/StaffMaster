import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./config/db.js";

const app = express();

app.use(express.json());
app.use(cors());

connectDB();

const port = process.env.PORT || 4040;

app.get("/", (req, res) => {
  res.send("API Working");
});

app.listen(port, () => {
  console.log("Server running on port ", port);
});
