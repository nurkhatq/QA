import { CompanyQuestionnaires } from '@/components/company-questionnaires';

export default function CompanyPage({ params }: { params: { id: string } }) {
  return <CompanyQuestionnaires companyId={params.id} />;
}
