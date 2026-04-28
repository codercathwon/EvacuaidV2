export default function AdminDashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="p-6 bg-white rounded-lg border shadow-sm">
          <p className="text-sm text-slate-500 font-medium tracking-wide uppercase">System Health</p>
          <p className="text-3xl font-bold mt-2 text-green-600">Operational</p>
        </div>
      </div>
    </div>
  );
}
