"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Button,
  Col,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { CATEGORIES, type AeoRuntimeSettings } from "@aeo-pcs/shared";
import { api, ApiError } from "@/lib/api";
import { hasActiveSubscription } from "@/lib/authRouting";
import VisibilityStepNav from "@/components/VisibilityStepNav";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateFromProfile, setCategory } from "@/store/businessSlice";
import { setPrompts, updatePrompt } from "@/store/promptsSlice";
import {
  resetVisibility,
  setError,
  setGeneratingItemId,
  setItemOutput,
  setJobId,
  setJobSnapshot,
  setPlan,
  setUiBusy,
} from "@/store/visibilitySlice";

const { Title, Text, Paragraph } = Typography;

const DEFAULT_RUNTIME: AeoRuntimeSettings = {
  promptsPerRun: 5,
  visibilityModelCount: 3,
  visibilityModels: [],
};

function downloadBlob(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function hasPlanContent(plan: { automatable?: unknown[]; manual?: unknown[] } | null | undefined) {
  if (!plan) return false;
  return (plan.automatable?.length || 0) > 0 || (plan.manual?.length || 0) > 0;
}

export default function VisibilityWizard() {
  const dispatch = useAppDispatch();
  const business = useAppSelector((s) => s.business);
  const prompts = useAppSelector((s) => s.prompts.prompts);
  const visibility = useAppSelector((s) => s.visibility);
  const [localBusyLabel, setLocalBusyLabel] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(!business.profileLoaded);
  const [stepOverride, setStepOverride] = useState<number | null>(null);
  const [runtime, setRuntime] = useState<AeoRuntimeSettings>(DEFAULT_RUNTIME);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [runsUsed, setRunsUsed] = useState(0);
  const [runsLimit, setRunsLimit] = useState(0);
  const [canRunVisibility, setCanRunVisibility] = useState(false);

  const promptsPerRun = runtime.promptsPerRun;
  const visibilityModelCount = runtime.visibilityModelCount;
  const modelLabels = runtime.visibilityModels.map((m) => m.label);

  const hasResults = Boolean(visibility.results?.length && visibility.score);
  const hasPlan = hasPlanContent(visibility.plan);

  const derivedStep = useMemo(() => {
    if (hasPlan) return 3;
    if (visibility.results || visibility.status === "queued" || visibility.status === "running") {
      return 2;
    }
    if (visibility.status === "failed") return 2;
    if (prompts.length) return 1;
    return 0;
  }, [hasPlan, prompts.length, visibility.results, visibility.status]);

  const currentStep = stepOverride ?? derivedStep;
  const jobRunning = visibility.status === "queued" || visibility.status === "running";
  const progressPct =
    visibility.progress && visibility.progress.total
      ? Math.round((visibility.progress.completed / visibility.progress.total) * 100)
      : 0;
  const activeModel = visibility.progress?.currentModel;

  function onStartNewCheck() {
    dispatch(resetVisibility());
    setStepOverride(prompts.length ? 1 : 0);
  }

  useEffect(() => {
    setStepOverride(null);
  }, [derivedStep]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      dispatch(setError(null));
      try {
        const [{ business: profile }, runtimeRes] = await Promise.all([
          api.getMyBusiness(),
          api.getRuntimeSettings().catch(() => null),
        ]);
        if (cancelled) return;
        dispatch(
          hydrateFromProfile({
            name: profile.name,
            category: profile.category,
            city: profile.city,
            country: profile.country,
            description: profile.description,
            websiteUrl: profile.websiteUrl,
          })
        );
        if (runtimeRes?.settings) {
          setRuntime(runtimeRes.settings);
        }
      } catch (err) {
        if (!cancelled) {
          dispatch(setError(err instanceof Error ? err.message : "Failed to load profile"));
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { subscription } = await api.getMySubscription();
        if (cancelled) return;
        const subscribed = hasActiveSubscription(subscription);
        const used = subscription.runsUsedThisPeriod ?? 0;
        const limit = subscription.runsLimit ?? 0;
        setRunsUsed(used);
        setRunsLimit(limit);
        setCanRunVisibility(subscribed && used < limit);
      } catch (err) {
        if (!cancelled) {
          setCanRunVisibility(false);
          dispatch(setError(err instanceof ApiError ? err.message : "Failed to load subscription"));
        }
      } finally {
        if (!cancelled) setSubscriptionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!visibility.jobId) return;

    let cancelled = false;
    let intervalId: number | undefined;

    const applyJob = (job: Awaited<ReturnType<typeof api.getVisibilityJob>>) => {
      dispatch(
        setJobSnapshot({
          status: job.status,
          progress: job.progress ?? null,
          results: job.results?.length ? job.results : null,
          score: job.score ?? null,
          plan: hasPlanContent(job.plan) ? job.plan! : null,
          itemOutputs: job.itemOutputs ?? {},
          error: job.error ?? null,
        })
      );
      return job.status;
    };

    const poll = async () => {
      try {
        const job = await api.getVisibilityJob(visibility.jobId!);
        if (cancelled) return null;
        return applyJob(job);
      } catch (err) {
        if (!cancelled) {
          dispatch(setError(err instanceof Error ? err.message : "Failed to poll job"));
        }
        return null;
      }
    };

    (async () => {
      const status = await poll();
      if (cancelled) return;
      if (status === "queued" || status === "running") {
        intervalId = window.setInterval(async () => {
          const next = await poll();
          if (next === "completed" || next === "failed") {
            if (intervalId) window.clearInterval(intervalId);
          }
        }, 2500);
      }
    })();

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [dispatch, visibility.jobId]);

  async function onGeneratePrompts() {
    if (!business.selected) return;
    dispatch(setUiBusy(true));
    setLocalBusyLabel("Generating prompts");
    dispatch(setError(null));
    try {
      const { prompts: next } = await api.generatePrompts({
        business: business.selected,
        category: business.category,
        city: business.city,
        country: business.country,
      });
      dispatch(setPrompts(next));
      dispatch(resetVisibility());
      setStepOverride(1);
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : "Prompt generation failed"));
    } finally {
      dispatch(setUiBusy(false));
      setLocalBusyLabel(null);
    }
  }

  async function onRunCheck() {
    if (!business.selected || !prompts.length) return;
    dispatch(setUiBusy(true));
    setLocalBusyLabel("Starting visibility check");
    dispatch(setError(null));
    try {
      const { jobId } = await api.createVisibilityJob({
        category: business.category,
        prompts,
      });
      dispatch(setJobId(jobId));
      dispatch(
        setJobSnapshot({
          status: "queued",
          progress: { completed: 0, total: prompts.length * visibilityModelCount },
          results: null,
          score: null,
          plan: null,
          itemOutputs: {},
          error: null,
        })
      );
      setStepOverride(2);
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : "Visibility check failed"));
    } finally {
      dispatch(setUiBusy(false));
      setLocalBusyLabel(null);
    }
  }

  async function onBuildPlan() {
    if (!visibility.jobId) return;
    dispatch(setUiBusy(true));
    setLocalBusyLabel("Building action plan");
    dispatch(setError(null));
    try {
      const { plan } = await api.buildPlan(visibility.jobId);
      dispatch(setPlan(plan));
      setStepOverride(3);
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : "Action plan failed"));
    } finally {
      dispatch(setUiBusy(false));
      setLocalBusyLabel(null);
    }
  }

  async function onGenerateItem(item: { id: string; title: string; description: string }) {
    if (!visibility.jobId) return;
    dispatch(setGeneratingItemId(item.id));
    dispatch(setError(null));
    try {
      const { content } = await api.generateItem({
        jobId: visibility.jobId,
        itemId: item.id,
        title: item.title,
        description: item.description,
      });
      dispatch(setItemOutput({ id: item.id, content }));
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : "Generation failed"));
    } finally {
      dispatch(setGeneratingItemId(null));
    }
  }

  async function onDownloadReport() {
    if (!visibility.jobId || !hasResults) return;
    dispatch(setUiBusy(true));
    setLocalBusyLabel("Preparing report");
    try {
      const report = await api.getReport(visibility.jobId);
      downloadBlob(report.html, report.filename);
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : "Report download failed"));
    } finally {
      dispatch(setUiBusy(false));
      setLocalBusyLabel(null);
    }
  }

  const stepItems = [
    { title: "Business", description: "Confirm profile" },
    { title: "Prompts", description: "Generate & edit" },
    { title: "Results", description: "AI mentions" },
    { title: "Action plan", description: "Next steps" },
  ];

  const stepHints = [
    "Review the profile used for this check.",
    "Generate buyer-intent prompts, edit if needed, then run.",
    "See mention rate across each model and prompt.",
    "Generate content and track manual tasks.",
  ];

  function onStepNavClick(index: number) {
    setStepOverride(index);
  }

  function StepShell({
    hint,
    children,
    foot,
  }: {
    hint?: string;
    children: ReactNode;
    foot?: ReactNode;
  }) {
    return (
      <div className="vis-content-shell">
        <div className="vis-content-head">
          <h3>{stepItems[currentStep]?.title}</h3>
          <p>{hint || stepHints[currentStep]}</p>
        </div>
        <div className="vis-content-body">{children}</div>
        {foot ? <div className="vis-content-foot">{foot}</div> : null}
      </div>
    );
  }

  function MetaPills() {
    return (
      <div className="vis-meta">
        {modelLabels.length > 0 && (
          <span className="vis-meta-pill">{modelLabels.join(" · ")}</span>
        )}
        {!subscriptionLoading && runsLimit > 0 && (
          <span className="vis-meta-pill">
            Runs {runsUsed}/{runsLimit}
          </span>
        )}
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: 280 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="vis-page">
      <header className="vis-header">
        <div className="vis-header-main">
          <div className="vis-eyebrow">Visibility</div>
          <Title level={2} className="vis-title">
            AI mention check
          </Title>
          <MetaPills />
        </div>
        <div className="vis-header-actions">
          <MetaPills />
          {(visibility.jobId || hasResults || hasPlan || visibility.status === "failed") && (
            <Button onClick={onStartNewCheck}>New check</Button>
          )}
        </div>
      </header>

      {(visibility.error || (!subscriptionLoading && !canRunVisibility)) && (
        <div style={{ marginBottom: 20 }}>
          {visibility.error && (
            <Alert
              type="error"
              showIcon
              message={visibility.error}
              style={{ marginBottom: 12 }}
              closable
              onClose={() => dispatch(setError(null))}
            />
          )}
          {!subscriptionLoading && !canRunVisibility && (
            <Alert
              type="warning"
              showIcon
              message={
                runsLimit > 0 && runsUsed >= runsLimit
                  ? "Monthly run limit reached."
                  : "Select a plan to run checks."
              }
              action={
                <Link
                  href={
                    runsLimit > 0 && runsUsed >= runsLimit
                      ? "/app/subscription"
                      : "/app/onboarding/plan"
                  }
                >
                  <Button size="small" type="primary">
                    {runsLimit > 0 && runsUsed >= runsLimit ? "Subscription" : "Plans"}
                  </Button>
                </Link>
              }
            />
          )}
        </div>
      )}

      <div className="vis-layout">
        <VisibilityStepNav
          steps={stepItems}
          current={currentStep}
          maxReachable={derivedStep}
          onStepClick={onStepNavClick}
        />

        <div className="vis-main">
          {currentStep === 0 && business.selected && (
            <StepShell
              foot={
                <>
                  <Button type="primary" onClick={() => setStepOverride(1)}>
                    Continue
                  </Button>
                  <Link href="/app/settings">
                    <Button type="link">Edit profile</Button>
                  </Link>
                </>
              }
            >
              <h4 className="vis-business-name">{business.selected.name}</h4>
              <div className="vis-detail-grid">
                <div className="vis-detail-item">
                  <label>Location</label>
                  <span>
                    {[business.city, business.country].filter(Boolean).join(", ") || "—"}
                  </span>
                </div>
                <div className="vis-detail-item">
                  <label>Category</label>
                  <span>{business.category || "—"}</span>
                </div>
                {business.websiteUrl && (
                  <div className="vis-detail-item vis-detail-full">
                    <label>Website</label>
                    <a href={business.websiteUrl} target="_blank" rel="noreferrer">
                      {business.websiteUrl}
                    </a>
                  </div>
                )}
                {business.selected.description && (
                  <div className="vis-detail-item vis-detail-full">
                    <label>Description</label>
                    <span>{business.selected.description}</span>
                  </div>
                )}
              </div>
            </StepShell>
          )}

          {currentStep === 1 && business.selected && (
            <StepShell
              foot={
                prompts.length > 0 ? (
                  <Button
                    type="primary"
                    size="large"
                    loading={
                      jobRunning ||
                      (visibility.uiBusy && localBusyLabel === "Starting visibility check")
                    }
                    disabled={!canRunVisibility || subscriptionLoading}
                    onClick={onRunCheck}
                  >
                    Run check ({prompts.length} × {visibilityModelCount} models)
                  </Button>
                ) : undefined
              }
            >
              <Row gutter={[12, 12]} style={{ marginBottom: prompts.length ? 20 : 0 }}>
                <Col xs={24} md={16}>
                  <Text type="secondary" style={{ display: "block", marginBottom: 6, fontSize: 12 }}>
                    Category
                  </Text>
                  <Select
                    style={{ width: "100%" }}
                    value={business.category || undefined}
                    onChange={(v) => dispatch(setCategory(v))}
                    options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  />
                </Col>
                <Col xs={24} md={8} style={{ display: "flex", alignItems: "flex-end" }}>
                  <Button
                    type="primary"
                    block
                    loading={visibility.uiBusy && localBusyLabel === "Generating prompts"}
                    onClick={onGeneratePrompts}
                  >
                    Generate {promptsPerRun}
                  </Button>
                </Col>
              </Row>

              {prompts.length > 0 && (
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                  {prompts.map((p, i) => (
                    <div key={i} className="vis-prompt-field">
                      <span className="vis-prompt-index">{i + 1}</span>
                      <Input.TextArea
                        value={p}
                        autoSize={{ minRows: 1, maxRows: 3 }}
                        onChange={(e) =>
                          dispatch(updatePrompt({ index: i, value: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </Space>
              )}
            </StepShell>
          )}

          {currentStep === 2 && (
            <StepShell
              hint={
                jobRunning
                  ? "Querying models with live web search."
                  : hasResults
                    ? "Review mentions and cited sources."
                    : stepHints[2]
              }
              foot={
                !jobRunning && hasResults ? (
                  <>
                    {hasResults && (
                      <Button
                        loading={visibility.uiBusy && localBusyLabel === "Preparing report"}
                        onClick={onDownloadReport}
                      >
                        Download report
                      </Button>
                    )}
                    {!hasPlan ? (
                      <Button
                        type="primary"
                        loading={visibility.uiBusy && localBusyLabel === "Building action plan"}
                        onClick={onBuildPlan}
                      >
                        Build action plan
                      </Button>
                    ) : (
                      <Button type="primary" onClick={() => setStepOverride(3)}>
                        View action plan
                      </Button>
                    )}
                  </>
                ) : !jobRunning && !hasResults ? (
                  <Button type="primary" onClick={onStartNewCheck}>
                    New check
                  </Button>
                ) : undefined
              }
            >
              {jobRunning && (
                <div className="vis-running">
                  <Progress percent={progressPct} strokeColor="#8FBF9F" style={{ marginBottom: 12 }} />
                  {visibility.progress?.currentPrompt && (
                    <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                      {visibility.progress.currentPrompt}
                    </Text>
                  )}
                  {modelLabels.length > 0 && (
                    <div className="vis-running-models">
                      {modelLabels.map((label) => (
                        <span
                          key={label}
                          className={`vis-model-chip${activeModel === label ? " is-active" : ""}`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {visibility.status === "failed" && !jobRunning && (
                <Alert type="error" showIcon message={visibility.error || "Check failed"} />
              )}

              {!jobRunning && hasResults && visibility.results && visibility.score && (
                <>
                  <div className="vis-score-block">
                    <div
                      className={`vis-score-value ${
                        visibility.score.visibilityPct >= 50 ? "is-good" : "is-low"
                      }`}
                    >
                      {visibility.score.visibilityPct}%
                    </div>
                    <div>
                      <Text style={{ color: "#EDEAE1" }}>Visibility score</Text>
                      <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 360 }}>
                        {business.selected?.name} mentioned in {visibility.score.totalMentions} of{" "}
                        {visibility.score.totalChecks} responses.
                      </Paragraph>
                    </div>
                  </div>

                  <Space direction="vertical" style={{ width: "100%" }} size={12}>
                    {visibility.results.map((r, i) => (
                      <div
                        key={i}
                        className="vis-panel"
                        style={{ padding: "14px 16px", borderRadius: 10 }}
                      >
                        <Text strong style={{ color: "#EDEAE1", display: "block", marginBottom: 12 }}>
                          {r.prompt}
                        </Text>
                        {r.perModel.map((m) => (
                          <div
                            key={m.model}
                            className={`vis-model-row ${m.mentioned ? "is-mentioned" : "is-missed"}`}
                          >
                            <div className="vis-model-label">
                              <Text strong style={{ color: "#EDEAE1" }}>
                                {m.model}
                              </Text>
                              <span className={`vis-tag ${m.mentioned ? "ok" : "no"}`}>
                                {m.mentioned ? "Mentioned" : "Not mentioned"}
                              </span>
                            </div>
                            <Paragraph
                              style={{ marginBottom: 4, color: "rgba(237, 234, 225, 0.85)" }}
                            >
                              {m.answer}
                            </Paragraph>
                            {m.sources.length > 0 && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Sources: {m.sources.map((s) => s.domain).join(", ")}
                              </Text>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </Space>
                </>
              )}

              {!jobRunning && !hasResults && visibility.status !== "failed" && (
                <Text type="secondary">
                  {visibility.status === "completed"
                    ? "No results saved. Start a new check."
                    : "Generate prompts and run a check."}
                </Text>
              )}
            </StepShell>
          )}

          {currentStep === 3 && hasPlan && visibility.plan && (
            <StepShell
              foot={
                <>
                  {hasResults && (
                    <Button
                      loading={visibility.uiBusy && localBusyLabel === "Preparing report"}
                      onClick={onDownloadReport}
                    >
                      Report
                    </Button>
                  )}
                  <Link href="/app/action-plan">
                    <Button type="primary">Open checklist</Button>
                  </Link>
                </>
              }
            >
              <Text className="vis-eyebrow" style={{ display: "block", marginBottom: 14 }}>
                Generate content
              </Text>
              <Space direction="vertical" style={{ width: "100%", marginBottom: 24 }} size={12}>
                {visibility.plan.automatable.map((item) => (
                  <div
                    key={item.id}
                    className="vis-panel"
                    style={{ padding: "14px 16px", borderRadius: 10 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <Text strong style={{ color: "#EDEAE1" }}>
                        {item.title}
                      </Text>
                      <Button
                        type="primary"
                        size="small"
                        loading={visibility.generatingItemId === item.id}
                        onClick={() => onGenerateItem(item)}
                      >
                        {visibility.itemOutputs[item.id] ? "Regenerate" : "Generate"}
                      </Button>
                    </div>
                    <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                      {item.description}
                    </Paragraph>
                    {visibility.itemOutputs[item.id] && (
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          border: "1px solid var(--ma-line)",
                          whiteSpace: "pre-wrap",
                          fontSize: 13,
                          color: "rgba(237, 234, 225, 0.9)",
                        }}
                      >
                        {visibility.itemOutputs[item.id]}
                      </div>
                    )}
                  </div>
                ))}
              </Space>

              <Text className="vis-eyebrow" style={{ display: "block", marginBottom: 12 }}>
                Manual tasks
              </Text>
              <Space direction="vertical" style={{ width: "100%" }} size={10}>
                {visibility.plan.manual.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--ma-line)",
                      borderLeft: "3px solid #C9773D",
                    }}
                  >
                    <Text strong style={{ color: "#EDEAE1" }}>
                      {item.title}
                    </Text>
                    <Paragraph style={{ marginBottom: 0, marginTop: 6 }} type="secondary">
                      {item.guidance}
                    </Paragraph>
                  </div>
                ))}
              </Space>
            </StepShell>
          )}
        </div>
      </div>
    </div>
  );
}
