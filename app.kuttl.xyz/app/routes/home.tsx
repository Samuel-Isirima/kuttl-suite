import { DashboardLayout } from "@/components/dashboard-layout";
import { MetricsGrid } from "@/components/metrics-grid";
import { ChartsSection } from "@/components/charts-section";
import { DataTable } from "@/components/data-table";

export default function Home() {
  return (
    <DashboardLayout>
      <MetricsGrid />
      <ChartsSection />
      <DataTable />
    </DashboardLayout>
  );
}