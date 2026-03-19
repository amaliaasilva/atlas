import ResultsClient from './ResultsClient';

export function generateStaticParams() {
  return [{ versionId: '_' }];
}

export default function Page() {
  return <ResultsClient />;
}
