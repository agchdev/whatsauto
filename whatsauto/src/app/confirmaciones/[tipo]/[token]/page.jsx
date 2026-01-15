import ConfirmationPage from "../../../../components/confirmations/ConfirmationPage";

const normalizeSegment = (value) =>
  typeof value === "string" ? value.trim() : "";

export default async function ConfirmationByTypePage({ params }) {
  const resolvedParams = await params;
  const tipo = normalizeSegment(resolvedParams?.tipo);
  const token = normalizeSegment(resolvedParams?.token);

  return <ConfirmationPage token={token} tipo={tipo} />;
}
