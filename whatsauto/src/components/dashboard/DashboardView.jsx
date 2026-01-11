import ClientsCard from "./ClientsCard";
import CompanyHeader from "./CompanyHeader";
import EmployeeCard from "./EmployeeCard";
import ServicesCard from "./ServicesCard";
import Sidebar from "./Sidebar";

export default function DashboardView({
  activeKey = "panel",
  companyName,
  dataError,
  dataLoading,
  employee,
  services,
  clients,
  onSignOut,
}) {
  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row">
      <Sidebar
        activeKey={activeKey}
        employeeEmail={employee.email}
        employeeName={employee.name}
        employeeRole={employee.role}
        onSignOut={onSignOut}
      />

      <section className="flex-1 space-y-6">
        <CompanyHeader companyName={companyName} dataLoading={dataLoading} />

        {dataError && (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
            {dataError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <EmployeeCard
            email={employee.email}
            name={employee.name}
            phone={employee.phone}
            role={employee.role}
          />
          <ServicesCard services={services} />
          <ClientsCard clients={clients} />
        </div>
      </section>
    </div>
  );
}
