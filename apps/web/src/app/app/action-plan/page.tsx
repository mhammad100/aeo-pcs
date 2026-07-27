"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Card, Checkbox, Empty, Input, Space, Spin, Typography, message } from "antd";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { api, ApiError } from "@/lib/api";
import type { ChecklistItem, ChecklistProgress } from "@aeo-pcs/shared";

const { Title, Paragraph, Text } = Typography;

export default function ActionPlanPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [progress, setProgress] = useState<ChecklistProgress>({ total: 0, done: 0, percent: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getChecklist();
      setItems(res.items);
      setProgress(res.progress);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load checklist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleDone(item: ChecklistItem, done: boolean) {
    setSavingKey(item.key);
    try {
      const res = await api.patchChecklistItem(item.key, { done });
      setItems(res.items);
      setProgress(res.progress);
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
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Could not save note");
    } finally {
      setSavingKey(null);
    }
  }

  const automatable = items.filter((i) => i.kind === "automatable");
  const manual = items.filter((i) => i.kind === "manual");

  return (
    <AppShell>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Action plan
      </Title>
      <Paragraph type="secondary">
        Checklist synced from your latest visibility action plan. Mark items done as you complete
        them.
      </Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Text strong>
          Progress · {progress.done}/{progress.total} ({progress.percent}%)
        </Text>
      </Card>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      {loading ? (
        <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <Empty
          description="No checklist yet. Run a visibility check and build an action plan first."
        >
          <Link href="/app/visibility">Open visibility</Link>
        </Empty>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={20}>
          {automatable.length > 0 && (
            <div>
              <Text style={{ color: "#8FBF9F", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Ready-made solutions
              </Text>
              <Space direction="vertical" style={{ width: "100%", marginTop: 12 }}>
                {automatable.map((item) => (
                  <ChecklistCard
                    key={item.key}
                    item={item}
                    saving={savingKey === item.key}
                    onToggle={toggleDone}
                    onNote={saveNote}
                  />
                ))}
              </Space>
            </div>
          )}
          {manual.length > 0 && (
            <div>
              <Text style={{ color: "#C9773D", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Needs your action
              </Text>
              <Space direction="vertical" style={{ width: "100%", marginTop: 12 }}>
                {manual.map((item) => (
                  <ChecklistCard
                    key={item.key}
                    item={item}
                    saving={savingKey === item.key}
                    onToggle={toggleDone}
                    onNote={saveNote}
                  />
                ))}
              </Space>
            </div>
          )}
        </Space>
      )}
    </AppShell>
  );
}

function ChecklistCard({
  item,
  saving,
  onToggle,
  onNote,
}: {
  item: ChecklistItem;
  saving: boolean;
  onToggle: (item: ChecklistItem, done: boolean) => void;
  onNote: (item: ChecklistItem, note: string) => void;
}) {
  const [note, setNote] = useState(item.note || "");

  useEffect(() => {
    setNote(item.note || "");
  }, [item.key, item.note]);

  return (
    <Card size="small" title={item.title}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Checkbox
          checked={item.done}
          disabled={saving}
          onChange={(e) => onToggle(item, e.target.checked)}
        >
          Mark done
        </Checkbox>
        {item.guidance && <Paragraph type="secondary">{item.guidance}</Paragraph>}
        <Input.TextArea
          rows={2}
          placeholder="Optional note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => onNote(item, note)}
          disabled={saving}
        />
      </Space>
    </Card>
  );
}
