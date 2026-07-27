import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import * as checklistService from "../services/checklist.service";

export async function getChecklist(req: AuthedRequest, res: Response) {
  const result = await checklistService.getChecklistForUser(req.userId!);
  res.json(result);
}

export async function patchChecklistItem(req: AuthedRequest, res: Response) {
  const result = await checklistService.updateChecklistItem({
    userId: req.userId!,
    key: decodeURIComponent(req.params.key),
    done: req.body.done,
    note: req.body.note,
  });
  res.json(result);
}
