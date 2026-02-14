import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="min-h-screen bg-[#FDFDF9] flex flex-col items-center relative overflow-hidden font-sans">
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-yellow-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-100/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-pink-100/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Hero Section */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center z-10">
        <div className="space-y-6">
          <span className="px-4 py-1.5 rounded-full bg-yellow-100/80 text-yellow-800 text-sm font-bold tracking-wide uppercase border border-yellow-200 inline-block">
            v1.0 Enterprise Edition
          </span>
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 tracking-tight leading-tight">
            Effortless <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500">
              Employee Management
            </span>
          </h1>
          <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Streamline your workforce operations with our intuitive platform.
            Manage schedules, track performance, and empower your team—all in
            one place.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-5 mt-10">
            <Link
              to="/login"
              className="px-10 py-4 bg-[#FCD34D] text-gray-900 font-bold rounded-2xl hover:bg-[#fbbf24] transition-all duration-300 shadow-sm hover:translate-y-[-2px] hover:shadow-md text-lg"
            >
              Access Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
