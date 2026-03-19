import DashboardUnitClient from './DashboardUnitClient';

export function generateStaticParams() {
  return [{ versionId: '_' }];
}

export default function Page() {
  return <DashboardUnitClient />;
}
