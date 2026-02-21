import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-hot-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, API } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        login(data.token);

        if (data.user.mustChangePassword) {
          toast("You must change your temporary password.", { icon: "🔐" });
          navigate("/change-password");
        } else {
          toast.success("Login successful");
          // Redirect based on role
          const role = data.user.role;
          if (role === "admin") {
            navigate("/admin/dashboard");
          } else if (role === "hr") {
            navigate("/hr/dashboard");
          } else if (role === "manager") {
            navigate("/manager/dashboard");
          } else if (role === "employee") {
            navigate("/employee/dashboard");
          } else {
            navigate("/");
          }
        }
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch (err) {
      toast.error("server error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDF9] px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-yellow-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-orange-100/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 bg-white/80 backdrop-blur-lg p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
        <div className="text-center">
          <h2 className="mt-2 text-4xl font-bold text-gray-900 tracking-tight">
            Welcome back
          </h2>
          <p className="mt-3 text-base text-gray-500 font-medium">
            Please enter your details to sign in.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-medium border border-red-100">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="group">
              <label
                htmlFor="email-address"
                className="block text-sm font-semibold text-gray-700 mb-1 ml-1"
              >
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3.5 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-gray-900 placeholder-gray-400 transition-all duration-200 font-medium"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-1 ml-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3.5 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-gray-900 placeholder-gray-400 transition-all duration-200 font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="text-sm flex justify-end">
            <a
              href="#"
              className="font-semibold text-gray-500 hover:text-gray-800 transition duration-200"
            >
              Forgot password?
            </a>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-gray-900 bg-[#FCD34D] hover:bg-[#fbbf24] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition duration-300 shadow-sm hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </form>
        <div className="text-center text-sm text-gray-500 font-medium">
          Note: Registration is restricted to HR & Admin.
        </div>
      </div>
    </div>
  );
};

export default Login;
