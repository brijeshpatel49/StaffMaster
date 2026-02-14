import Sidebar from "../../components/Admin/Sidebar";

const AdminLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-[#FDFDF9]">
      <Sidebar />
      <div className="ml-64 p-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-500 mt-2 font-medium">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-yellow-100 border border-yellow-200 flex items-center justify-center text-yellow-700 font-bold">
              A
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>

      {/* Background Blobs - Subtler for dashboard */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-yellow-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-orange-100/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      </div>
    </div>
  );
};

export default AdminLayout;
