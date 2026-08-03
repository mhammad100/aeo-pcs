"use client";

import Link from "next/link";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Button,
  Input,
  Modal,
  Progress,
  Space,
  Spin,
  Typography,
} from "antd";
import { type AeoRuntimeSettings, COPY, formatCategoryLabel } from "@aeo-pcs/shared";
import { api, ApiError } from "@/lib/api";
import { hasActiveSubscription } from "@/lib/authRouting";
import VisibilityInsights from "@/components/VisibilityInsights";
import VisibilityStepNav from "@/components/VisibilityStepNav";
import { useVisibilityJobStream } from "@/hooks/useVisibilityJobStream";
import PresenceAuditPanel from "@/components/PresenceAuditPanel";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateFromProfile } from "@/store/businessSlice";
import { clearPrompts, resetPrompts, setPrompts, updatePrompt } from "@/store/promptsSlice";
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

const PROMPTS_DRAFT_KEY = "visibility-prompts-draft";

function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
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
  const visibility = useAppSelector((s) => s.visibility);
  const prompts = useAppSelector((s) => s.prompts);
  const [localBusyLabel, setLocalBusyLabel] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(!business.profileLoaded);
  const [stepOverride, setStepOverride] = useState<number | null>(null);
  const [runtime, setRuntime] = useState<AeoRuntimeSettings>(DEFAULT_RUNTIME);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [runsUsed, setRunsUsed] = useState(0);
  const [runsLimit, setRunsLimit] = useState(0);
  const [canRunVisibility, setCanRunVisibility] = useState(false);
  const [lastPrompts, setLastPrompts] = useState<string[]>([]);
  const [showPromptChoice, setShowPromptChoice] = useState(false);
  const [resumeChecked, setResumeChecked] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const cancelConfirmCallbackRef = useRef<(() => void) | null>(null);

  const visibilityModelCount = runtime.visibilityModelCount;
  const modelLabels = runtime.visibilityModels.map((m) => m.label);

  const hasResults = Boolean(visibility.results?.length && visibility.score);
  const hasPlan = hasPlanContent(visibility.plan);
  const isPartialCompletion =
    visibility.status === "completed" && Boolean(visibility.error) && hasResults;

  const showReview = prompts.prompts.length > 0 && !visibility.jobId && !visibility.status;
  const promptsEdited =
    prompts.prompts.length === prompts.original.length &&
    prompts.prompts.some((p, i) => p !== prompts.original[i]);

  const derivedStep = useMemo(() => {
    if (hasPlan) return 1;
    if (
      visibility.jobId ||
      visibility.results ||
      visibility.status === "queued" ||
      visibility.status === "running" ||
      visibility.status === "failed" ||
      visibility.status === "cancelled" ||
      visibility.status === "completed"
    ) {
      return 0;
    }
    return 0;
  }, [hasPlan, visibility.jobId, visibility.results, visibility.status]);

  const currentStep = stepOverride ?? derivedStep;
  const jobRunning = visibility.status === "queued" || visibility.status === "running";
  const progressPct =
    visibility.progress && visibility.progress.total
      ? Math.round((visibility.progress.completed / visibility.progress.total) * 100)
      : 0;
  const activeModel = visibility.progress?.currentModel;

  useVisibilityJobStream(visibility.jobId);

  async function refreshSubscription() {
    const { subscription } = await api.getMySubscription();
    const subscribed = hasActiveSubscription(subscription);
    const used = subscription.runsUsedThisPeriod ?? 0;
    const limit = subscription.runsLimit ?? 0;
    setRunsUsed(used);
    setRunsLimit(limit);
    setCanRunVisibility(subscribed && used < limit);
  }

  function clearPromptDraft() {
    sessionStorage.removeItem(PROMPTS_DRAFT_KEY);
  }

  function savePromptDraft(nextPrompts: string[]) {
    sessionStorage.setItem(PROMPTS_DRAFT_KEY, JSON.stringify(nextPrompts));
  }

  function confirmCancelRun(onConfirmed: () => void) {
    cancelConfirmCallbackRef.current = onConfirmed;
    setCancelConfirmOpen(true);
  }

  function closeCancelConfirm() {
    setCancelConfirmOpen(false);
    cancelConfirmCallbackRef.current = null;
  }

  async function handleConfirmCancel() {
    if (!visibility.jobId) return;
    dispatch(setUiBusy(true));
    try {
      await api.cancelVisibilityJob(visibility.jobId);
      dispatch(
        setJobSnapshot({
          status: "cancelled",
          error: COPY.visibility.cancelledMessage,
        })
      );
      clearPromptDraft();
      await refreshSubscription();
      const onConfirmed = cancelConfirmCallbackRef.current;
      closeCancelConfirm();
      onConfirmed?.();
    } catch (err) {
      dispatch(setError(err instanceof ApiError ? err.message : COPY.visibility.cancelFailed));
    } finally {
      dispatch(setUiBusy(false));
    }
  }

  function onStartNewCheck() {
    const startFresh = () => {
      dispatch(resetVisibility());
      dispatch(clearPrompts());
      clearPromptDraft();
      setShowPromptChoice(false);
      setStepOverride(0);
    };

    if (jobRunning && visibility.jobId) {
      confirmCancelRun(startFresh);
      return;
    }
    startFresh();
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
        const { business: profile } = await api.getMyBusiness();
        if (cancelled) return;
        dispatch(
          hydrateFromProfile({
            name: profile.name,
            category: profile.category,
            customCategory: profile.customCategory,
            city: profile.city,
            country: profile.country,
            description: profile.description,
            nameAliases: profile.nameAliases,
            targetLocations: profile.targetLocations,
            targetItems: profile.targetItems,
            websiteUrl: profile.websiteUrl,
          })
        );
        try {
          const runtimeRes = await api.getRuntimeSettings();
          if (!cancelled && runtimeRes.settings) {
            setRuntime(runtimeRes.settings);
          }
        } catch {
          /* keep default runtime settings */
        }
      } catch (err) {
        if (!cancelled) {
          dispatch(setError(err instanceof ApiError ? err.message : "Failed to load profile"));
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
    if (profileLoading || visibility.jobId || resumeChecked) return;
    let cancelled = false;
    (async () => {
      try {
        const { job } = await api.getActiveVisibilityJob();
        if (cancelled) return;
        if (job) {
          dispatch(setJobId(job.id));
          dispatch(
            setJobSnapshot({
              status: job.status,
              progress: job.progress,
              results: job.results,
              score: job.score,
              plan: job.plan ?? null,
              itemOutputs: job.itemOutputs ?? {},
              error: job.error,
            })
          );
        } else {
          const draft = sessionStorage.getItem(PROMPTS_DRAFT_KEY);
          if (draft) {
            const parsed = JSON.parse(draft) as string[];
            if (Array.isArray(parsed) && parsed.length) {
              dispatch(setPrompts(parsed));
            }
          }
        }
      } catch {
        /* resume optional */
      } finally {
        if (!cancelled) setResumeChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileLoading, visibility.jobId, resumeChecked, dispatch]);

  useEffect(() => {
    if (
      visibility.status === "completed" ||
      visibility.status === "cancelled" ||
      visibility.status === "failed"
    ) {
      void refreshSubscription();
    }
  }, [visibility.status]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { insights } = await api.getInsights();
        if (!cancelled && insights.lastPrompts?.length) {
          setLastPrompts(insights.lastPrompts);
        }
      } catch {
        /* insights optional for prompt reuse */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!visibility.jobId || !hasResults) return;
    let cancelled = false;
    (async () => {
      try {
        const job = await api.getVisibilityJob(visibility.jobId!);
        if (cancelled) return;
        if (hasPlanContent(job.plan)) {
          dispatch(
            setJobSnapshot({
              status: job.status,
              plan: job.plan!,
              itemOutputs: job.itemOutputs ?? {},
            })
          );
        }
      } catch {
        /* plan may not exist yet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, visibility.jobId, hasResults]);

  async function onGeneratePrompts() {
    if (!business.selected) return;
    dispatch(setUiBusy(true));
    setLocalBusyLabel("Generating prompts");
    dispatch(setError(null));
    dispatch(resetVisibility());
    dispatch(clearPrompts());
    setShowPromptChoice(false);
    try {
      const { prompts: generated } = await api.generatePrompts({
        business: business.selected,
        category: business.category,
        city: business.city,
        country: business.country,
      });
      dispatch(setPrompts(generated));
      savePromptDraft(generated);
      setStepOverride(0);
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : "Prompt generation failed"));
    } finally {
      dispatch(setUiBusy(false));
      setLocalBusyLabel(null);
    }
  }

  function onBeginCheck() {
    if (lastPrompts.length > 0) {
      setShowPromptChoice(true);
      return;
    }
    void onGeneratePrompts();
  }

  function onKeepPreviousPrompts() {
    dispatch(resetVisibility());
    dispatch(clearPrompts());
    dispatch(setPrompts(lastPrompts));
    setShowPromptChoice(false);
    setStepOverride(0);
  }

  function onEditPrompt(index: number, value: string) {
    dispatch(updatePrompt({ index, value }));
    const next = [...prompts.prompts];
    next[index] = value;
    savePromptDraft(next);
  }

  function onResetPrompts() {
    dispatch(resetPrompts());
  }

  async function onConfirmAndRun() {
    const finalPrompts = prompts.prompts.map((p) => p.trim()).filter(Boolean);
    if (!finalPrompts.length) return;
    dispatch(setUiBusy(true));
    setLocalBusyLabel("Preparing visibility check");
    dispatch(setError(null));
    try {
      const { jobId } = await api.createVisibilityJob({
        category: business.category,
        prompts: finalPrompts,
      });

      dispatch(setJobId(jobId));
      setLastPrompts(finalPrompts);
      clearPromptDraft();
      dispatch(
        setJobSnapshot({
          status: "queued",
          progress: { completed: 0, total: finalPrompts.length * visibilityModelCount },
          results: null,
          score: null,
          plan: null,
          itemOutputs: {},
          error: null,
        })
      );
      dispatch(clearPrompts());
      setStepOverride(0);
      await refreshSubscription();
    } catch (err) {
      if (err instanceof ApiError && err.code === "VISIBILITY_IN_PROGRESS" && err.details?.jobId) {
        const activeJobId = String(err.details.jobId);
        const job = await api.getVisibilityJob(activeJobId);
        dispatch(setJobId(activeJobId));
        dispatch(
          setJobSnapshot({
            status: job.status,
            progress: job.progress,
            results: job.results,
            score: job.score,
            plan: job.plan ?? null,
            itemOutputs: job.itemOutputs ?? {},
            error: job.error,
          })
        );
        return;
      }
      dispatch(setError(err instanceof ApiError ? err.message : "Visibility check failed"));
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
      setStepOverride(1);
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
      downloadBlob(report.data, report.filename, report.contentType);
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : "Report download failed"));
    } finally {
      dispatch(setUiBusy(false));
      setLocalBusyLabel(null);
    }
  }

  const stepItems = [
    { title: "Visibility check", description: "Index & insights" },
    { title: "Action plan", description: "Next steps" },
  ];

  const stepHints = [
    "We generate search prompts from your profile and check how AI assistants mention you.",
    "Turn insights into content tasks and manual improvements.",
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

  const showIdle =
    !visibility.jobId &&
    !jobRunning &&
    !hasResults &&
    !visibility.status &&
    !showReview &&
    !showPromptChoice;

  return (
    <>
    <div className="vis-page">
      <header className="vis-header">
        <div className="vis-header-main">
          <div className="vis-eyebrow">Visibility</div>
          <Title level={2} className="vis-title">
            AI visibility check
          </Title>
          <MetaPills />
        </div>
        <div className="vis-header-actions">
          <MetaPills />
          {(visibility.jobId ||
            hasResults ||
            hasPlan ||
            showReview ||
            visibility.status === "failed" ||
            visibility.status === "cancelled") && (
            <Button onClick={onStartNewCheck}>New check</Button>
          )}
        </div>
      </header>

      {(visibility.error || (!subscriptionLoading && !canRunVisibility)) && (
        <div style={{ marginBottom: 20 }}>
          {visibility.error && (
            <Alert
              type={isPartialCompletion ? "warning" : "error"}
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

      {jobRunning && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message={COPY.visibility.inProgressTitle}
          description={COPY.visibility.inProgressDescription}
        />
      )}

      <div className="vis-layout">
        <VisibilityStepNav
          steps={stepItems}
          current={currentStep}
          maxReachable={derivedStep}
          onStepClick={onStepNavClick}
        />

        <div className="vis-main">
          {currentStep === 0 && (
            <StepShell
              hint={
                jobRunning
                  ? "Checking how AI assistants mention your business."
                  : showReview
                    ? "Review the generated prompts below. You can edit wording."
                    : hasResults
                      ? "Your visibility index and key insights."
                      : stepHints[0]
              }
              foot={
                showReview ? (
                  <>
                    <Button onClick={onResetPrompts} disabled={!promptsEdited}>
                      Reset
                    </Button>
                    <Button
                      type="primary"
                      loading={visibility.uiBusy}
                      disabled={prompts.prompts.every((p) => !p.trim())}
                      onClick={onConfirmAndRun}
                    >
                      {localBusyLabel || "Confirm & run check"}
                    </Button>
                  </>
                ) : showIdle ? (
                  <Button
                    type="primary"
                    size="large"
                    loading={visibility.uiBusy}
                    disabled={!canRunVisibility || subscriptionLoading || !business.selected}
                    onClick={onBeginCheck}
                  >
                    {localBusyLabel || "Run visibility check"}
                  </Button>
                ) : showPromptChoice ? (
                  <>
                    <Button onClick={() => setShowPromptChoice(false)}>Back</Button>
                    <Button type="primary" onClick={onKeepPreviousPrompts}>
                      Keep previous questions
                    </Button>
                    <Button
                      type="primary"
                      ghost
                      loading={visibility.uiBusy}
                      onClick={onGeneratePrompts}
                    >
                      Generate new questions
                    </Button>
                  </>
                ) : !jobRunning && hasResults ? (
                  <>
                    {hasResults && (
                      <Button
                        loading={visibility.uiBusy && localBusyLabel === "Preparing report"}
                        onClick={onDownloadReport}
                      >
                        Download PDF report
                      </Button>
                    )}
                    {!hasPlan ? (
                      <Button
                        type="primary"
                        loading={visibility.uiBusy && localBusyLabel === "Building action plan"}
                        onClick={onBuildPlan}
                      >
                        Generate action plan
                      </Button>
                    ) : (
                      <Button type="primary" onClick={() => setStepOverride(1)}>
                        View action plan
                      </Button>
                    )}
                  </>
                ) : !jobRunning && visibility.status === "failed" ? (
                  <Button type="primary" onClick={onGeneratePrompts}>
                    Try again
                  </Button>
                ) : !jobRunning && visibility.status === "cancelled" ? (
                  <Button type="primary" onClick={onGeneratePrompts}>
                    Start new check
                  </Button>
                ) : jobRunning ? (
                  <Button danger onClick={() => confirmCancelRun(() => {})} loading={visibility.uiBusy}>
                    Cancel check
                  </Button>
                ) : undefined
              }
            >
              {showReview && (
                <div className="vis-prompts-review">
                  <Space direction="vertical" style={{ width: "100%" }} size={12}>
                    {prompts.prompts.map((p, i) => (
                      <div className="vis-prompt-field" key={i}>
                        <span className="vis-prompt-index">{i + 1}</span>
                        <Input.TextArea
                          value={p}
                          autoSize={{ minRows: 1, maxRows: 4 }}
                          maxLength={300}
                          onChange={(e) => onEditPrompt(i, e.target.value)}
                        />
                      </div>
                    ))}
                  </Space>
                </div>
              )}

              {showPromptChoice && (
                <div className="vis-prompt-choice">
                  <h4 className="vis-business-name">Search questions</h4>
                  <Paragraph type="secondary" style={{ marginBottom: 16, maxWidth: 520 }}>
                    You have questions from your last visibility run. Keep them for consistent
                    tracking, or generate fresh ones from your profile.
                  </Paragraph>
                  <ul className="vis-prompt-choice-list">
                    {lastPrompts.map((p, i) => (
                      <li key={i}>
                        <span className="vis-prompt-index">{i + 1}</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showIdle && business.selected && (
                <div className="vis-idle">
                  <h4 className="vis-business-name">{business.selected.name}</h4>
                  <Paragraph type="secondary" style={{ marginBottom: 16, maxWidth: 520 }}>
                    We&apos;ll generate buyer-intent prompts from your profile, query{" "}
                    {visibilityModelCount} AI assistants with live search, and summarize how often
                    they mention you.
                  </Paragraph>
                  <div className="vis-detail-grid">
                    <div className="vis-detail-item">
                      <label>Location</label>
                      <span>
                        {[business.city, business.country].filter(Boolean).join(", ") || "—"}
                      </span>
                    </div>
                    <div className="vis-detail-item">
                      <label>Category</label>
                      <span>
                        {formatCategoryLabel(
                          business.category,
                          business.selected?.customCategory
                        ) || "—"}
                      </span>
                    </div>
                  </div>
                  <Link href="/app/settings" className="vis-prompts-settings-link">
                    Edit profile
                  </Link>
                </div>
              )}

              {jobRunning && (
                <div className="vis-running">
                  <Progress percent={progressPct} strokeColor="#8FBF9F" style={{ marginBottom: 12 }} />
                  <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                    Checking {business.selected?.name || "your business"} across AI assistants…
                  </Text>
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

              {visibility.status === "failed" && !jobRunning && !hasResults && (
                <Alert type="error" showIcon message={visibility.error || "Check failed"} />
              )}

              {visibility.status === "cancelled" && !jobRunning && !hasResults && (
                <Alert type="warning" showIcon message={visibility.error || COPY.visibility.cancelledMessage} />
              )}

              {!jobRunning && hasResults && visibility.results && visibility.score && (
                <VisibilityInsights
                  results={visibility.results}
                  score={visibility.score}
                  businessName={business.selected?.name}
                  nameAliases={business.selected?.nameAliases}
                  promptContext={{
                    description: business.selected?.description,
                    category: business.category,
                    targetItems: business.selected?.targetItems,
                    targetLocations: business.selected?.targetLocations,
                    city: business.city,
                  }}
                />
              )}
            </StepShell>
          )}

          {currentStep === 1 && hasPlan && visibility.plan && (
            <StepShell
              foot={
                <>
                  {hasResults && (
                    <Button
                      loading={visibility.uiBusy && localBusyLabel === "Preparing report"}
                      onClick={onDownloadReport}
                    >
                      PDF report
                    </Button>
                  )}
                  <Link href="/app/action-plan">
                    <Button type="primary">Open checklist</Button>
                  </Link>
                </>
              }
            >
              {visibility.plan.presenceAudit && (
                <PresenceAuditPanel audit={visibility.plan.presenceAudit} />
              )}

              <Text className="vis-eyebrow" style={{ display: "block", marginBottom: 14 }}>
                Recommended content
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
                Action checklist
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

    <Modal
      open={cancelConfirmOpen}
      onCancel={closeCancelConfirm}
      footer={null}
      closable={false}
      centered
      className="ma-unsaved-dialog"
      width={400}
      destroyOnClose
    >
      <div className="ma-unsaved-dialog-body">
        <div className="ma-unsaved-dialog-icon">
          <ExclamationCircleOutlined />
        </div>
        <h3 className="ma-unsaved-dialog-title">{COPY.visibility.cancelConfirmTitle}</h3>
        <p className="ma-unsaved-dialog-text">{COPY.visibility.cancelConfirmBody}</p>
        <div className="ma-unsaved-dialog-actions">
          <Button type="primary" danger loading={visibility.uiBusy} onClick={() => void handleConfirmCancel()}>
            {COPY.visibility.cancelConfirmOk}
          </Button>
          <Button disabled={visibility.uiBusy} onClick={closeCancelConfirm}>
            {COPY.visibility.cancelConfirmCancel}
          </Button>
        </div>
      </div>
    </Modal>
    </>
  );
}
