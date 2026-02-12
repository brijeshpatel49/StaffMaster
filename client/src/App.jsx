import { useState } from "react";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex flex-row items-center justify-center ">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">
        Employee Management System
      </h1>
    </div>
  );
}

export default App;
