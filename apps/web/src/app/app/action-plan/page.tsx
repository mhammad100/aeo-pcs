"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, message } from "antd";
import AppShell from "@/components/AppShell";
import {
  ActionPlanProgressHero,
  ActionPlanTabs,
  automatableItemId,
  type ActionPlanFilter,
  type ActionPlanTab,
} from "@/components/ActionPlanChecklist";
import { api, ApiError } from "@/lib/api";
import type { ChecklistItem, ChecklistProgress } from "@aeo-pcs/shared";

const EMPTY_PROGRESS: ChecklistProgress = { total: 0, done: 0, percent: 0 };

export default function ActionPlanPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [progress, setProgress] = useState<ChecklistProgress>(EMPTY_PROGRESS);
  const [progressAutomatable, setProgressAutomatable] = useState<ChecklistProgress>(EMPTY_PROGRESS);
  const [progressManual, setProgressManual] = useState<ChecklistProgress>(EMPTY_PROGRESS);
  const [itemOutputs, setItemOutputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [generatingByKey, setGeneratingByKey] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<ActionPlanTab>("ready-made");
  const [readyFilter, setReadyFilter] = useState<ActionPlanFilter>("pending");
  const [manualFilter, setManualFilter] = useState<ActionPlanFilter>("pending");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getChecklist();
      setItems(res.items);
      setProgress(res.progress);
      setProgressAutomatable(res.progressAutomatable ?? EMPTY_PROGRESS);
      setProgressManual(res.progressManual ?? EMPTY_PROGRESS);
      setItemOutputs(res.itemOutputs ?? {});

      const autoPending = (res.progressAutomatable?.total ?? 0) - (res.progressAutomatable?.done ?? 0);
      const manualPending = (res.progressManual?.total ?? 0) - (res.progressManual?.done ?? 0);
      if (manualPending > autoPending && (res.progressManual?.total ?? 0) > 0) {
        setActiveTab("needs-attention");
      } else if ((res.progressAutomatable?.total ?? 0) > 0) {
        setActiveTab("ready-made");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load checklist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const automatable = useMemo(
    () => items.filter((item) => item.kind === "automatable"),
    [items]
  );
  const manual = useMemo(() => items.filter((item) => item.kind === "manual"), [items]);

  async function toggleDone(item: ChecklistItem, done: boolean) {
    setSavingKey(item.key);
    try {
      const res = await api.patchChecklistItem(item.key, { done });
      setItems(res.items);
      setProgress(res.progress);
      setProgressAutomatable(checklistProgressFor(res.items, "automatable"));
      setProgressManual(checklistProgressFor(res.items, "manual"));
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Could not update item");
    } finally {
      setSavingKey(null);
    }
  }

  async function saveNote(item: ChecklistItem, note: string) {
    if ((item.note || "") === note) return;
    setSavingKey(item.key);
    try {
      const res = await api.patchChecklistItem(item.key, { note });
      setItems(res.items);
      setProgress(res.progress);
      setProgressAutomatable(checklistProgressFor(res.items, "automatable"));
      setProgressManual(checklistProgressFor(res.items, "manual"));
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Could not save note");
    } finally {
      setSavingKey(null);
    }
  }

  async function generateContent(item: ChecklistItem) {
    const itemId = automatableItemId(item.key);
    if (!itemId || !item.sourceJobId) {
      message.error("Run a visibility check and build an action plan first");
      return;
    }
    if (itemOutputs[itemId] || generatingByKey[item.key]) return;

    setGeneratingByKey((prev) => ({ ...prev, [item.key]: true }));
    try {
      const { content } = await api.generateItem({
        jobId: item.sourceJobId,
        itemId,
        title: item.title,
        description: item.guidance || item.title,
      });
      setItemOutputs((prev) => ({ ...prev, [itemId]: content }));
      message.success("Content generated");
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Generation failed");
    } finally {
      setGeneratingByKey((prev) => {
        const next = { ...prev };
        delete next[item.key];
        return next;
      });
    }
  }

  const pending = progress.total - progress.done;

  return (
    <AppShell>
      <div className="dash-page action-plan-page">
        <header className="dash-page-header">
          <p className="dash-page-subtitle">
            Publish ready-made content and work through listing tasks from your latest visibility
            plan.
          </p>
        </header>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        <ActionPlanProgressHero
          progress={progress}
          progressAutomatable={progressAutomatable}
          progressManual={progressManual}
          loading={loading}
        />

        {!loading && items.length === 0 ? (
          <div className="action-plan-empty">
            <h2>No action plan yet</h2>
            <p>Run a visibility check and generate an action plan to get your personalized checklist.</p>
            <Link href="/app/visibility">
              <Button type="primary" size="large">
                Run visibility check
              </Button>
            </Link>
          </div>
        ) : (
          !loading && (
            <ActionPlanTabs
              automatable={automatable}
              manual={manual}
              progressAutomatable={progressAutomatable}
              progressManual={progressManual}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              readyFilter={readyFilter}
              manualFilter={manualFilter}
              onReadyFilterChange={setReadyFilter}
              onManualFilterChange={setManualFilter}
              savingKey={savingKey}
              generatingByKey={generatingByKey}
              itemOutputs={itemOutputs}
              onToggle={toggleDone}
              onNote={saveNote}
              onGenerate={generateContent}
            />
          )
        )}

        {!loading && items.length > 0 && pending > 0 && (
          <p className="action-plan-footer-hint">
            Generate content in <strong>Ready-made</strong>, then complete listing tasks under{" "}
            <strong>Needs attention</strong>.
          </p>
        )}
      </div>
    </AppShell>
  );
}

function checklistProgressFor(
  items: ChecklistItem[],
  kind: ChecklistItem["kind"]
): ChecklistProgress {
  const subset = items.filter((item) => item.kind === kind);
  const total = subset.length;
  const done = subset.filter((item) => item.done).length;
  return {
    total,
    done,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}
