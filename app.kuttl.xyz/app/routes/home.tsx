import { DashboardLayout } from "@/components/dashboard-layout";
import { MetricsGrid } from "@/components/metrics-grid";
import { ChartsSection } from "@/components/charts-section";
import { DataTable } from "@/components/data-table";
import { AuthWrapper } from "../components/auth-wrapper";

export default function Home() {
  return (
    <AuthWrapper>
      <DashboardLayout>
        <MetricsGrid />
        <ChartsSection />
        <DataTable />
      </DashboardLayout>
    </AuthWrapper>
  );
}