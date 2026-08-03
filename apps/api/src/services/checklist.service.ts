import type { ActionPlan, ChecklistItem, ChecklistProgress, ChecklistResponse } from "@aeo-pcs/shared";
import { BusinessModel } from "../models/Business";
import { VisibilityJobModel } from "../models/VisibilityJob";
import { AppError } from "../utils/AppError";

function checklistProgress(items: { done?: boolean }[]): ChecklistProgress {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  return {
    total,
    done,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}

function serializeItem(item: {
  key: string;
  kind: string;
  title: string;
  guidance?: string | null;
  done?: boolean;
  doneAt?: Date | null;
  note?: string | null;
  sourceJobId?: unknown;
}): ChecklistItem {
  return {
    key: item.key,
    kind: item.kind as ChecklistItem["kind"],
    title: item.title,
    guidance: item.guidance || undefined,
    done: Boolean(item.done),
    doneAt: item.doneAt ? new Date(item.doneAt).toISOString() : null,
    note: item.note || undefined,
    sourceJobId: item.sourceJobId ? String(item.sourceJobId) : undefined,
  };
}

export async function syncChecklistFromPlan(input: {
  businessId: string;
  jobId: string;
  plan: ActionPlan;
}) {
  const business = await BusinessModel.findById(input.businessId);
  if (!business) return;

  const existingByKey = new Map(
    (business.checklist || []).map((item) => [item.key, item])
  );

  const next: Array<{
    key: string;
    kind: "automatable" | "manual";
    title: string;
    guidance: string;
    done: boolean;
    doneAt: Date | null;
    note: string;
    sourceJobId: string;
  }> = [];

  for (const item of input.plan.automatable) {
    const key = `auto:${item.id}`;
    const prev = existingByKey.get(key);
    next.push({
      key,
      kind: "automatable",
      title: item.title,
      guidance: item.description || "",
      done: Boolean(prev?.done),
      doneAt: prev?.doneAt || null,
      note: prev?.note || "",
      sourceJobId: input.jobId,
    });
  }

  input.plan.manual.forEach((item, index) => {
    const key = `manual:${index}:${item.title}`;
    const prev =
      existingByKey.get(key) ||
      [...existingByKey.values()].find(
        (p) => p.kind === "manual" && p.title === item.title
      );
    next.push({
      key,
      kind: "manual",
      title: item.title,
      guidance: item.guidance || "",
      done: Boolean(prev?.done),
      doneAt: prev?.doneAt || null,
      note: prev?.note || "",
      sourceJobId: input.jobId,
    });
  });

  business.set("checklist", next);
  await business.save();
}

export async function getChecklistForUser(userId: string): Promise<ChecklistResponse> {
  const business = await BusinessModel.findOne({ ownerUserId: userId }).lean();
  if (!business) {
    throw new AppError("Business not found", 404);
  }
  const items = (business.checklist || []).map((item) => serializeItem(item));
  const automatable = items.filter((item) => item.kind === "automatable");
  const manual = items.filter((item) => item.kind === "manual");
  const itemOutputs = await loadItemOutputsForChecklist(items);

  return {
    items,
    progress: checklistProgress(items),
    progressAutomatable: checklistProgress(automatable),
    progressManual: checklistProgress(manual),
    itemOutputs,
  };
}

export async function updateChecklistItem(input: {
  userId: string;
  key: string;
  done?: boolean;
  note?: string;
}) {
  const business = await BusinessModel.findOne({ ownerUserId: input.userId });
  if (!business) {
    throw new AppError("Business not found", 404);
  }

  const items = business.checklist || [];
  const idx = items.findIndex((item) => item.key === input.key);
  if (idx < 0) {
    throw new AppError("Checklist item not found", 404);
  }

  if (typeof input.done === "boolean") {
    items[idx].done = input.done;
    items[idx].doneAt = input.done ? new Date() : null;
  }
  if (typeof input.note === "string") {
    items[idx].note = input.note.slice(0, 500);
  }

  business.markModified("checklist");
  await business.save();

  const serialized = (business.checklist || []).map((item) => serializeItem(item));
  return {
    item: serializeItem(items[idx]),
    items: serialized,
    progress: checklistProgress(serialized),
  };
}

export { checklistProgress };

function mapItemOutputs(itemOutputs: unknown): Record<string, string> {
  if (itemOutputs instanceof Map) {
    return Object.fromEntries(itemOutputs);
  }
  return (itemOutputs as Record<string, string>) || {};
}

async function loadItemOutputsForChecklist(items: ChecklistItem[]): Promise<Record<string, string>> {
  const jobIds = [
    ...new Set(
      items
        .filter((item) => item.kind === "automatable" && item.sourceJobId)
        .map((item) => item.sourceJobId as string)
    ),
  ];
  if (!jobIds.length) return {};

  const jobs = await VisibilityJobModel.find({ _id: { $in: jobIds } })
    .select("itemOutputs")
    .lean();

  const merged: Record<string, string> = {};
  for (const job of jobs) {
    Object.assign(merged, mapItemOutputs(job.itemOutputs));
  }
  return merged;
}
