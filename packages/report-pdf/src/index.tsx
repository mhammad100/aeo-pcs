import { Buffer } from "node:buffer";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { VisibilityReportDocument } from "./VisibilityReportDocument";
import type { VisibilityReportInput } from "./types";

export type { VisibilityReportInput } from "./types";
export { VisibilityReportDocument } from "./VisibilityReportDocument";

export async function renderVisibilityReportPdf(input: VisibilityReportInput): Promise<Buffer> {
  const buffer = await renderToBuffer(<VisibilityReportDocument {...input} />);
  return Buffer.from(buffer);
}
