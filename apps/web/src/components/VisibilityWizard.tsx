"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Typography,
} from "antd";
import { CATEGORIES } from "@aeo-pcs/shared";
import { api } from "@/lib/api";
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

export default function VisibilityWizard() {
  const dispatch = useAppDispatch();
  const business = useAppSelector((s) => s.business);
  const prompts = useAppSelector((s) => s.prompts.prompts);
  const visibility = useAppSelector((s) => s.visibility);
  const [localBusyLabel, setLocalBusyLabel] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(!business.profileLoaded);
  const [stepOverride, setStepOverride] = useState<number | null>(null);

  const derivedStep = useMemo(() => {
    if (visibility.plan) return 3;
    if (visibility.results || visibility.status === "queued" || visibility.status === "running") {
      return 2;
    }
    if (prompts.length) return 1;
    return 0;
  }, [prompts.length, visibility.plan, visibility.results, visibility.status]);

  const currentStep = stepOverride ?? derivedStep;

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
            city: profile.city,
            country: profile.country,
            description: profile.description,
            websiteUrl: profile.websiteUrl,
          })
        );
      } catch (err) {
        if (!cancelled) {
          dispatch(setError(err instanceof Error ? err.message : "Failed to load business profile"));
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
    if (!visibility.jobId) return;
    if (visibility.status === "completed" || visibility.status === "failed") return;

    let cancelled = false;
    const poll = async () => {
      try {
        const job = await api.getVisibilityJob(visibility.jobId!);
        if (cancelled) return;
        dispatch(
          setJobSnapshot({
            status: job.status,
            progress: job.progress,
            results: job.results,
            score: job.score,
            plan: job.plan,
            itemOutputs: job.itemOutputs,
            error: job.error,
          })
        );
      } catch (err) {
        if (!cancelled) {
          dispatch(setError(err instanceof Error ? err.message : "Failed to poll job"));
        }
      }
    };

    poll();
    const id = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [dispatch, visibility.jobId, visibility.status]);

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
    dispatch(setPlan(null));
    try {
      const { jobId } = await api.createVisibilityJob({
        category: business.category,
        prompts,
      });
      dispatch(setJobId(jobId));
      dispatch(
        setJobSnapshot({
          status: "queued",
          progress: { completed: 0, total: prompts.length * 3 },
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
      dispatch(setError(err instanceof Error ? err.message : "Couldn't generate that item"));
    } finally {
      dispatch(setGeneratingItemId(null));
    }
  }

  async function onDownloadReport() {
    if (!visibility.jobId || !business.selected) return;
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

  const jobRunning = visibility.status === "queued" || visibility.status === "running";
  const progressPct =
    visibility.progress && visibility.progress.total
      ? Math.round((visibility.progress.completed / visibility.progress.total) * 100)
      : 0;

  if (profileLoading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
        <Spin tip="Loading your business…" />
      </div>
    );
  }

  return (
    <div style={{ color: "#EDEAE1" }}>
      <div style={{ maxWidth: 960 }}>
        <Space direction="vertical" size={8} style={{ width: "100%", marginBottom: 24 }}>
          <Text style={{ color: "#8FBF9F", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 13 }}>
            Visibility check
          </Text>
          <Title level={2} style={{ margin: 0, color: "#EDEAE1" }}>
            Run prompts and measure AI mentions
          </Title>
          <Text type="secondary">Signed-in session · Master AEO</Text>
          <Button onClick={onDownloadReport} disabled={!business.selected || !visibility.jobId}>
            Download report
          </Button>
        </Space>

        <Steps
          current={currentStep}
          style={{ marginBottom: 28 }}
          items={[
            { title: "Confirm" },
            { title: "Prompts" },
            { title: "Visibility" },
            { title: "Action plan" },
          ]}
        />

        {visibility.error && (
          <Alert
            type="error"
            showIcon
            message={visibility.error}
            style={{ marginBottom: 20 }}
            closable
            onClose={() => dispatch(setError(null))}
          />
        )}

        {currentStep === 0 && business.selected && (
          <Card title="Confirm your business">
            <Paragraph style={{ marginBottom: 4 }}>
              <Text strong>{business.selected.name}</Text>
            </Paragraph>
            <Paragraph type="secondary" style={{ marginBottom: 4 }}>
              {[business.city, business.country].filter(Boolean).join(", ")}
              {business.category ? ` · ${business.category}` : ""}
            </Paragraph>
            {business.websiteUrl && (
              <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                <a href={business.websiteUrl} target="_blank" rel="noreferrer">
                  {business.websiteUrl}
                </a>
              </Paragraph>
            )}
            {business.selected.description && (
              <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                {business.selected.description}
              </Paragraph>
            )}
            <Paragraph type="secondary">
              Identity comes from your saved profile. <Link href="/app/settings">Edit in Settings</Link>
            </Paragraph>
            <Button type="primary" onClick={() => setStepOverride(1)}>
              Continue to prompts
            </Button>
          </Card>
        )}

        {currentStep === 1 && business.selected && (
          <Card
            title="Generate prompts"
            extra={
              <Button type="link" onClick={() => setStepOverride(0)}>
                Back
              </Button>
            }
          >
            <Row gutter={10} style={{ marginBottom: prompts.length ? 16 : 0 }}>
              <Col xs={24} md={16}>
                <Select
                  style={{ width: "100%" }}
                  value={business.category || undefined}
                  onChange={(v) => dispatch(setCategory(v))}
                  options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                />
              </Col>
              <Col xs={24} md={8}>
                <Button
                  type="primary"
                  block
                  loading={visibility.uiBusy && localBusyLabel === "Generating prompts"}
                  onClick={onGeneratePrompts}
                >
                  Generate 5 prompts
                </Button>
              </Col>
            </Row>

            {prompts.length > 0 && (
              <Space direction="vertical" style={{ width: "100%" }}>
                {prompts.map((p, i) => (
                  <Input
                    key={i}
                    value={p}
                    onChange={(e) => dispatch(updatePrompt({ index: i, value: e.target.value }))}
                  />
                ))}
                <Button
                  type="primary"
                  loading={
                    jobRunning || (visibility.uiBusy && localBusyLabel === "Starting visibility check")
                  }
                  onClick={onRunCheck}
                >
                  Run visibility check
                </Button>
              </Space>
            )}
          </Card>
        )}

        {currentStep === 2 && (
          <Space direction="vertical" style={{ width: "100%" }} size={16}>
            <Card
              extra={
                !jobRunning && visibility.results ? (
                  <Button type="link" onClick={() => setStepOverride(1)}>
                    Back to prompts
                  </Button>
                ) : null
              }
            >
              {jobRunning && (
                <>
                  <Text>Checking AI visibility across simulated model styles…</Text>
                  <Progress percent={progressPct} style={{ marginTop: 12 }} />
                  {visibility.progress?.currentModel && (
                    <Text type="secondary">
                      {visibility.progress.currentModel}
                      {visibility.progress.currentPrompt
                        ? ` — ${visibility.progress.currentPrompt}`
                        : ""}
                    </Text>
                  )}
                </>
              )}

              {!jobRunning && visibility.results && visibility.score && (
                <>
                  <Space align="baseline" style={{ marginBottom: 16 }}>
                    <Title
                      level={1}
                      style={{
                        margin: 0,
                        color: visibility.score.visibilityPct >= 50 ? "#8FBF9F" : "#E8967A",
                      }}
                    >
                      {visibility.score.visibilityPct}%
                    </Title>
                    <Text type="secondary">
                      AI visibility score. {business.selected?.name} was mentioned in{" "}
                      {visibility.score.totalMentions} of {visibility.score.totalChecks} model
                      responses across {visibility.results.length} prompts.
                    </Text>
                  </Space>

                  <Space direction="vertical" style={{ width: "100%" }} size={16}>
                    {visibility.results.map((r, i) => (
                      <Card key={i} size="small" title={r.prompt}>
                        {r.perModel.map((m) => (
                          <div
                            key={m.model}
                            style={{
                              marginBottom: 12,
                              paddingLeft: 12,
                              borderLeft: `3px solid ${m.mentioned ? "#8FBF9F" : "#5C4A45"}`,
                            }}
                          >
                            <Text style={{ color: m.mentioned ? "#8FBF9F" : "#E8967A" }}>
                              {m.model}, {m.mentioned ? "mentioned" : "not mentioned"}
                            </Text>
                            <Paragraph style={{ marginBottom: 4 }}>{m.answer}</Paragraph>
                            {m.sources.length > 0 && (
                              <Text type="secondary">
                                Sources cited: {m.sources.map((s) => s.domain).join(", ")}
                              </Text>
                            )}
                          </div>
                        ))}
                      </Card>
                    ))}
                  </Space>

                  {!visibility.plan && (
                    <Button
                      type="primary"
                      style={{ marginTop: 16 }}
                      loading={visibility.uiBusy && localBusyLabel === "Building action plan"}
                      onClick={onBuildPlan}
                    >
                      Build action plan
                    </Button>
                  )}
                </>
              )}

              {!jobRunning && !visibility.results && (
                <Text type="secondary">Start a run from the prompts step.</Text>
              )}
            </Card>
          </Space>
        )}

        {currentStep === 3 && visibility.plan && (
          <Space direction="vertical" style={{ width: "100%" }} size={20}>
            <Card
              extra={
                <Space>
                  <Link href="/app/action-plan">
                    <Button>Open checklist</Button>
                  </Link>
                  <Button type="link" onClick={() => setStepOverride(2)}>
                    Back to results
                  </Button>
                </Space>
              }
            >
              <Text style={{ color: "#8FBF9F", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Ready made solutions
              </Text>
              <Paragraph type="secondary">
                Generate copy here, then track completion on the Action plan checklist.
              </Paragraph>
              <Space direction="vertical" style={{ width: "100%" }}>
                {visibility.plan.automatable.map((item) => (
                  <Card
                    key={item.id}
                    size="small"
                    title={item.title}
                    extra={
                      <Button
                        type="primary"
                        loading={visibility.generatingItemId === item.id}
                        onClick={() => onGenerateItem(item)}
                      >
                        {visibility.itemOutputs[item.id] ? "Regenerate" : "Generate"}
                      </Button>
                    }
                  >
                    <Paragraph type="secondary">{item.description}</Paragraph>
                    {visibility.itemOutputs[item.id] && (
                      <Card size="small" style={{ whiteSpace: "pre-wrap" }}>
                        {visibility.itemOutputs[item.id]}
                      </Card>
                    )}
                  </Card>
                ))}
              </Space>
            </Card>

            <div>
              <Text style={{ color: "#C9773D", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Needs your action
              </Text>
              <Paragraph type="secondary">
                These need a human step. Mark them done on the Action plan page.
              </Paragraph>
              <Space direction="vertical" style={{ width: "100%" }}>
                {visibility.plan.manual.map((item, i) => (
                  <Card key={i} size="small" title={item.title}>
                    <Paragraph style={{ marginBottom: 0 }}>{item.guidance}</Paragraph>
                  </Card>
                ))}
              </Space>
            </div>
          </Space>
        )}
      </div>
    </div>
  );
}
