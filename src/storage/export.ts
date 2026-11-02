import JSZip from "jszip";
import type { CaptureRecord } from "../types";

export function toExportRecord({ photo: _photo, ...record }: CaptureRecord) {
  return { ...record, photoFile: `photos/${record.id}.jpg` };
}

export async function exportRecords(records: CaptureRecord[]): Promise<void> {
  const zip = new JSZip();
  zip.file("records.json", JSON.stringify(records.map(toExportRecord), null, 2));
  for (const record of records) zip.file(`photos/${record.id}.jpg`, record.photo);

  const blob = await zip.generateAsync({ type: "blob" });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `gis-records-${stamp}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 60000);
}
