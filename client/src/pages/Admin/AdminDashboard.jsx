import AdminLayout from "../../components/Admin/AdminLayout";

const AdminDashboard = () => {
  return (
    <AdminLayout title="Dashboard" subtitle="Overview of your organization.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Card 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-yellow-50 rounded-xl">
              <span className="text-2xl">👥</span>
            </div>
            <span className="text-sm font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
              +12%
            </span>
          </div>
          <h3 className="text-gray-500 font-medium text-sm">Total Employees</h3>
          <p className="text-3xl font-bold text-gray-900 mt-1">1,240</p>
        </div>

        {/* Stats Card 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <span className="text-2xl">🏢</span>
            </div>
            <span className="text-sm font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
              Total
            </span>
          </div>
          <h3 className="text-gray-500 font-medium text-sm">
            Active Departments
          </h3>
          <p className="text-3xl font-bold text-gray-900 mt-1">8</p>
        </div>

        {/* Stats Card 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-pink-50 rounded-xl">
              <span className="text-2xl">🌴</span>
            </div>
            <span className="text-sm font-bold text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-lg">
              Today
            </span>
          </div>
          <h3 className="text-gray-500 font-medium text-sm">On Leave</h3>
          <p className="text-3xl font-bold text-gray-900 mt-1">12</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
