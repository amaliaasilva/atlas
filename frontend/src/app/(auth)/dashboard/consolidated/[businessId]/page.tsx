import DashboardConsolidatedClient from './DashboardConsolidatedClient';

export function generateStaticParams() {
  return [{ businessId: '_' }];
}

export default function Page() {
  return <DashboardConsolidatedClient />;
}
