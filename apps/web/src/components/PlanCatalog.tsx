"use client";

import { Button, Card, Col, Row, Typography } from "antd";
import type { ProductPlan } from "@aeo-pcs/shared";

const { Paragraph } = Typography;

type Props = {
  plans: ProductPlan[];
  currentPlanId?: string | null;
  subscribingId?: string | null;
  onSelect: (planId: string) => void;
  selectLabel?: string;
};

export default function PlanCatalog({
  plans,
  currentPlanId,
  subscribingId,
  onSelect,
  selectLabel = "Select",
}: Props) {
  return (
    <Row gutter={[16, 16]}>
      {plans.map((plan) => {
        const isCurrent = currentPlanId === plan.id;
        return (
          <Col xs={24} md={12} lg={8} key={plan.id}>
            <Card
              title={plan.name}
              style={{ height: "100%" }}
              actions={[
                <Button
                  key="select"
                  type={isCurrent ? "default" : "primary"}
                  block
                  disabled={isCurrent || Boolean(subscribingId && subscribingId !== plan.id)}
                  loading={subscribingId === plan.id}
                  onClick={() => onSelect(plan.id)}
                >
                  {isCurrent ? "Current plan" : selectLabel}
                </Button>,
              ]}
            >
              <Paragraph strong style={{ fontSize: 20, marginBottom: 8 }}>
                {plan.priceLabel || `${plan.currency} ${plan.price}`}
              </Paragraph>
              {plan.blurb ? (
                <Paragraph type="secondary" style={{ minHeight: 48 }}>
                  {plan.blurb}
                </Paragraph>
              ) : null}
              <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
                <li>{plan.limits.visibilityRunsPerMonth} visibility checks / month</li>
              </ul>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
