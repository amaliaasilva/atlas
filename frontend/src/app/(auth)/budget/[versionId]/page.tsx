import BudgetVersionClient from './BudgetVersionClient';

export function generateStaticParams() {
  return [{ versionId: '_' }];
}

export default function Page() {
  return <BudgetVersionClient />;
}
