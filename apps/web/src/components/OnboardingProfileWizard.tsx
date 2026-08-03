"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, message } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";
import BusinessProfileForm, {
  type BusinessProfileFormValues,
} from "@/components/BusinessProfileForm";
import type { BusinessProfile } from "@aeo-pcs/shared";
import { mergeProfileValues, profileFormValues, canPersistProfile } from "@/lib/businessProfileForm";

type WizardStep = "identity" | "location" | "online" | "social";

const WIZARD_STEPS: {
  id: WizardStep;
  title: string;
  subtitle: string;
  hint: string;
  optional?: boolean;
}[] = [
  {
    id: "identity",
    title: "Business identity",
    subtitle: "Name, category & services",
    hint: "Name, category, and what you offer — this powers your visibility checks.",
  },
  {
    id: "location",
    title: "Location",
    subtitle: "City & country",
    hint: "Where you operate so we can run relevant local visibility checks.",
  },
  {
    id: "online",
    title: "Online presence",
    subtitle: "Website & Google",
    hint: "Add your website and Google Business Profile — we'll reference these in your action plan.",
    optional: true,
  },
  {
    id: "social",
    title: "Social profiles",
    subtitle: "Instagram, LinkedIn & more",
    hint: "Connect the platforms you use — optional, but helps when we generate content for you.",
    optional: true,
  },
];

function identityComplete(profile: BusinessProfile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.name &&
      profile.category &&
      (profile.category !== "Other" || (profile.customCategory?.trim().length ?? 0) >= 2) &&
      (profile.description?.trim().length ?? 0) >= 10 &&
      (profile.targetItems?.length ?? 0) > 0,
  );
}

function locationComplete(profile: BusinessProfile | null): boolean {
  return Boolean(profile?.city?.trim() && profile?.country?.trim());
}

function firstIncompleteStep(profile: BusinessProfile | null): number {
  if (!identityComplete(profile)) return 0;
  if (!locationComplete(profile)) return 1;
  return 2;
}

type Props = {
  business: BusinessProfile | null;
  saving: boolean;
  onSave: (values: BusinessProfileFormValues) => Promise<BusinessProfile>;
  onComplete: () => void;
};

export default function OnboardingProfileWizard({
  business,
  saving,
  onSave,
  onComplete,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form] = Form.useForm<BusinessProfileFormValues>();
  const initializedRef = useRef(false);
  const formId = "onboarding-profile-form";

  const step = WIZARD_STEPS[stepIndex]!;
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;

  useEffect(() => {
    if (business && !business.profileCompletedAt) {
      sessionStorage.setItem("onboarding-profile-started", "1");
    }
  }, [business]);

  useEffect(() => {
    if (!business) return;
    form.setFieldsValue(profileFormValues(business));
    if (!initializedRef.current) {
      setStepIndex(firstIncompleteStep(business));
      initializedRef.current = true;
    }
  }, [business, form]);

  const progressPercent = useMemo(
    () => Math.round(((stepIndex + 1) / WIZARD_STEPS.length) * 100),
    [stepIndex],
  );

  async function validateCurrentStep(): Promise<boolean> {
    const category = form.getFieldValue("category");
    try {
      if (step.id === "identity") {
        const fields: (keyof BusinessProfileFormValues)[] = [
          "name",
          "category",
          "description",
          "targetItems",
        ];
        if (category === "Other") {
          await form.validateFields([...fields, "customCategory"]);
        } else {
          await form.validateFields(fields);
        }
      } else if (step.id === "location") {
        await form.validateFields(["city", "country"]);
      } else if (step.id === "online") {
        await form.validateFields(["websiteUrl", "googleBusinessUrl"]);
      }
      return true;
    } catch {
      return false;
    }
  }

  async function persistDraft(): Promise<BusinessProfile | null> {
    const values = form.getFieldsValue(true);
    const merged = mergeProfileValues(business, values);

    if (!canPersistProfile(merged)) {
      return business;
    }

    try {
      return await onSave(merged);
    } catch {
      return null;
    }
  }

  async function finishWizard(skipValidation: boolean) {
    const values = form.getFieldsValue(true);
    const merged = mergeProfileValues(business, values);

    if (!canPersistProfile(merged)) {
      message.warning("Add your city and country to finish setup");
      return;
    }

    if (!skipValidation && !(await validateCurrentStep())) {
      message.error("Please complete the required fields");
      return;
    }

    const saved = await persistDraft();
    if (!saved) return;

    if (saved.profileCompletedAt) {
      onComplete();
    } else {
      message.warning("Add required identity and location details to finish setup");
    }
  }

  async function goNext(skipValidation = false) {
    if (!skipValidation && !(await validateCurrentStep())) {
      message.error("Please complete the required fields");
      return;
    }

    if (isLastStep) {
      await finishWizard(skipValidation);
      return;
    }

    const values = form.getFieldsValue(true);
    const merged = mergeProfileValues(business, values);

    if (canPersistProfile(merged)) {
      const saved = await persistDraft();
      if (!saved && !skipValidation) return;
    }

    setStepIndex((i) => i + 1);
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div className="onboarding-profile-wizard">
      <div className="onboarding-profile-progress">
        <div className="onboarding-profile-progress-meta">
          <span>
            Step {stepIndex + 1} of {WIZARD_STEPS.length}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="onboarding-profile-progress-bar">
          <div
            className="onboarding-profile-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <nav className="onboarding-profile-steps" aria-label="Profile setup steps">
        {WIZARD_STEPS.map((item, index) => {
          const isActive = index === stepIndex;
          const isDone = index < stepIndex;
          return (
            <button
              key={item.id}
              type="button"
              className={`onboarding-profile-step${isActive ? " is-active" : ""}${isDone ? " is-done" : ""}`}
              onClick={() => index < stepIndex && setStepIndex(index)}
              disabled={index > stepIndex}
            >
              <span className="onboarding-profile-step-num">{isDone ? "✓" : index + 1}</span>
              <span className="onboarding-profile-step-copy">
                <span className="onboarding-profile-step-label">{item.title}</span>
                <span className="onboarding-profile-step-sub">{item.subtitle}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="onboarding-card">
        <div className="onboarding-card-head">
          <h2>{step.title}</h2>
          <p>{step.hint}</p>
          {step.optional && <span className="onboarding-optional-badge">Optional</span>}
        </div>

        <BusinessProfileForm
          formId={formId}
          form={form}
          initial={business}
          activeSection={step.id}
          hideSubmit
          onSubmit={() => {}}
        />

        <div className="onboarding-card-foot">
          <div className="onboarding-card-foot-start">
            {stepIndex > 0 && (
              <Button icon={<ArrowLeftOutlined />} onClick={goBack} disabled={saving}>
                Back
              </Button>
            )}
          </div>
          <div className="onboarding-card-foot-end">
            {step.optional && (
              <Button type="text" onClick={() => void goNext(true)} disabled={saving}>
                Skip for now
              </Button>
            )}
            <Button
              type="primary"
              size="large"
              loading={saving}
              icon={isLastStep ? undefined : <ArrowRightOutlined />}
              iconPosition="end"
              onClick={() => void goNext(false)}
            >
              {isLastStep ? "Finish setup" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
