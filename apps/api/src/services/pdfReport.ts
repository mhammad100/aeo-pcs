import { renderVisibilityReportPdf } from "@aeo-pcs/report-pdf";
import type { VisibilityReportInput } from "@aeo-pcs/report-pdf";

export async function buildReportPdfBuffer(input: VisibilityReportInput): Promise<Buffer> {
  return renderVisibilityReportPdf(input);
}
