"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircleFilled,
  CopyOutlined,
  EditOutlined,
  RobotOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Input, Segmented, Spin, Tabs, message } from "antd";
import type { ChecklistItem, ChecklistProgress } from "@aeo-pcs/shared";

export type ActionPlanTab = "ready-made" | "needs-attention";
export type ActionPlanFilter = "all" | "pending" | "done";

export function automatableItemId(key: string): string | null {
  if (!key.startsWith("auto:")) return null;
  return key.slice(5);
}

function filterItems(items: ChecklistItem[], filter: ActionPlanFilter): ChecklistItem[] {
  if (filter === "pending") return items.filter((item) => !item.done);
  if (filter === "done") return items.filter((item) => item.done);
  return items;
}

function tabLabel(name: string, progress: ChecklistProgress) {
  return `${name} (${progress.done}/${progress.total})`;
}

type ItemCardProps = {
  item: ChecklistItem;
  saving: boolean;
  itemOutput?: string;
  generating: boolean;
  onToggle: (item: ChecklistItem, done: boolean) => void;
  onNote: (item: ChecklistItem, note: string) => void;
  onGenerate?: (item: ChecklistItem) => void;
};

function ActionPlanItemCard({
  item,
  saving,
  itemOutput,
  generating,
  onToggle,
  onNote,
  onGenerate,
}: ItemCardProps) {
  const [note, setNote] = useState(item.note || "");
  const [noteOpen, setNoteOpen] = useState(Boolean(item.note?.trim()));
  const isAutomatable = item.kind === "automatable";

  useEffect(() => {
    setNote(item.note || "");
    if (item.note?.trim()) setNoteOpen(true);
  }, [item.key, item.note]);

  async function copyOutput() {
    if (!itemOutput) return;
    try {
      await navigator.clipboard.writeText(itemOutput);
      message.success("Copied to clipboard");
    } catch {
      message.error("Could not copy");
    }
  }

  return (
    <article className={`action-plan-item${item.done ? " is-done" : ""}`}>
      <div className="action-plan-item__head">
        <Checkbox
          className="action-plan-item__check"
          checked={item.done}
          disabled={saving}
          onChange={(e) => onToggle(item, e.target.checked)}
        />
        <div className="action-plan-item__title-wrap">
          <h3 className="action-plan-item__title">{item.title}</h3>
          <span
            className={`action-plan-item__kind${isAutomatable ? " is-auto" : " is-manual"}`}
          >
            {isAutomatable ? (
              <>
                <RobotOutlined /> Ready-made
              </>
            ) : (
              <>
                <ToolOutlined /> Manual
              </>
            )}
          </span>
        </div>
        <div className="action-plan-item__actions">
          {isAutomatable && onGenerate && !itemOutput && (
            <Button
              type="primary"
              size="small"
              loading={generating}
              disabled={!item.sourceJobId || saving}
              onClick={() => onGenerate(item)}
            >
              Generate
            </Button>
          )}
          {item.done && <CheckCircleFilled className="action-plan-item__done-icon" />}
        </div>
      </div>

      {item.guidance && <p className="action-plan-item__guidance">{item.guidance}</p>}

      {isAutomatable && itemOutput && (
        <div className="action-plan-item__output">
          <div className="action-plan-item__output-head">
            <span>Generated content</span>
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={copyOutput}>
              Copy
            </Button>
          </div>
          <div className="action-plan-item__output-body">{itemOutput}</div>
        </div>
      )}

      <div className="action-plan-item__notes">
        {!noteOpen ? (
          <button
            type="button"
            className="action-plan-item__note-toggle"
            onClick={() => setNoteOpen(true)}
          >
            <EditOutlined /> Add a note
          </button>
        ) : (
          <Input.TextArea
            rows={2}
            placeholder={
              isAutomatable
                ? "Optional note, e.g. where you published this"
                : "Optional note track what you completed"
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => onNote(item, note)}
            disabled={saving}
            className="action-plan-item__note-input"
          />
        )}
      </div>
    </article>
  );
}

export function ActionPlanProgressHero({
  progress,
  progressAutomatable,
  progressManual,
  loading,
}: {
  progress: ChecklistProgress;
  progressAutomatable: ChecklistProgress;
  progressManual: ChecklistProgress;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="action-plan-hero action-plan-hero--loading">
        <Spin />
      </div>
    );
  }

  const remaining = progress.total - progress.done;

  return (
    <div className="action-plan-hero">
      <div className="action-plan-hero__main">
        <span className="action-plan-hero__label">Checklist progress</span>
        <div className="action-plan-hero__value">{progress.percent}%</div>
        <p className="action-plan-hero__summary">
          <strong>{progress.done}</strong> of <strong>{progress.total}</strong> tasks complete
          {remaining > 0 ? ` · ${remaining} remaining` : " · All done"}
        </p>
        <div className="action-plan-hero__split">
          <span className="action-plan-hero__split-item is-auto">
            Content {progressAutomatable.done}/{progressAutomatable.total}
          </span>
          <span className="action-plan-hero__split-item is-manual">
            Tasks {progressManual.done}/{progressManual.total}
          </span>
        </div>
      </div>
      <div className="action-plan-hero__bar-wrap">
        <div className="action-plan-hero__bar">
          <div
            className="action-plan-hero__bar-fill"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="action-plan-hero__stats">
          <span>{progress.done} done</span>
          <span>{remaining} left</span>
        </div>
      </div>
    </div>
  );
}

type TabPanelProps = {
  items: ChecklistItem[];
  filter: ActionPlanFilter;
  onFilterChange: (filter: ActionPlanFilter) => void;
  savingKey: string | null;
  generatingByKey: Record<string, boolean>;
  itemOutputs: Record<string, string>;
  onToggle: (item: ChecklistItem, done: boolean) => void;
  onNote: (item: ChecklistItem, note: string) => void;
  onGenerate?: (item: ChecklistItem) => void;
  emptyLabel: string;
};

function ActionPlanTabPanel({
  items,
  filter,
  onFilterChange,
  savingKey,
  generatingByKey,
  itemOutputs,
  onToggle,
  onNote,
  onGenerate,
  emptyLabel,
}: TabPanelProps) {
  const filtered = useMemo(() => filterItems(items, filter), [items, filter]);

  return (
    <div className="action-plan-tab-panel">
      <div className="action-plan-tab-panel__toolbar">
        <Segmented
          className="action-plan-filter"
          value={filter}
          onChange={(value) => onFilterChange(value as ActionPlanFilter)}
          options={[
            { label: "All", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Done", value: "done" },
          ]}
        />
      </div>

      {!filtered.length ? (
        <p className="action-plan-tab-empty">{emptyLabel}</p>
      ) : (
        <div className="action-plan-section__list">
          {filtered.map((item) => {
            const itemId = automatableItemId(item.key);
            return (
              <ActionPlanItemCard
                key={item.key}
                item={item}
                saving={savingKey === item.key}
                generating={Boolean(generatingByKey[item.key])}
                itemOutput={itemId ? itemOutputs[itemId] : undefined}
                onToggle={onToggle}
                onNote={onNote}
                onGenerate={onGenerate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

type TabsProps = {
  automatable: ChecklistItem[];
  manual: ChecklistItem[];
  progressAutomatable: ChecklistProgress;
  progressManual: ChecklistProgress;
  activeTab: ActionPlanTab;
  onTabChange: (tab: ActionPlanTab) => void;
  readyFilter: ActionPlanFilter;
  manualFilter: ActionPlanFilter;
  onReadyFilterChange: (filter: ActionPlanFilter) => void;
  onManualFilterChange: (filter: ActionPlanFilter) => void;
  savingKey: string | null;
  generatingByKey: Record<string, boolean>;
  itemOutputs: Record<string, string>;
  onToggle: (item: ChecklistItem, done: boolean) => void;
  onNote: (item: ChecklistItem, note: string) => void;
  onGenerate: (item: ChecklistItem) => void;
};

export function ActionPlanTabs({
  automatable,
  manual,
  progressAutomatable,
  progressManual,
  activeTab,
  onTabChange,
  readyFilter,
  manualFilter,
  onReadyFilterChange,
  onManualFilterChange,
  savingKey,
  generatingByKey,
  itemOutputs,
  onToggle,
  onNote,
  onGenerate,
}: TabsProps) {
  const items = [
    {
      key: "ready-made",
      label: tabLabel("Ready-made", progressAutomatable),
      children: (
        <ActionPlanTabPanel
          items={automatable}
          filter={readyFilter}
          onFilterChange={onReadyFilterChange}
          savingKey={savingKey}
          generatingByKey={generatingByKey}
          itemOutputs={itemOutputs}
          onToggle={onToggle}
          onNote={onNote}
          onGenerate={onGenerate}
          emptyLabel="No ready-made content tasks in this view."
        />
      ),
    },
    {
      key: "needs-attention",
      label: tabLabel("Needs attention", progressManual),
      children: (
        <ActionPlanTabPanel
          items={manual}
          filter={manualFilter}
          onFilterChange={onManualFilterChange}
          savingKey={savingKey}
          generatingByKey={generatingByKey}
          itemOutputs={itemOutputs}
          onToggle={onToggle}
          onNote={onNote}
          emptyLabel="No manual tasks in this view."
        />
      ),
    },
  ];

  return (
    <Tabs
      className="action-plan-tabs"
      activeKey={activeTab}
      onChange={(key) => onTabChange(key as ActionPlanTab)}
      items={items}
    />
  );
}
