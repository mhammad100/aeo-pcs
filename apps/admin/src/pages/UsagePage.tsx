import { Alert, Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function UsagePage() {
  return (
    <div>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Usage & profit
      </Title>
      <Alert
        type="info"
        showIcon
        message="Coming in v0.5"
        description="Token usage events (who / when / model / input-output tokens) and margin vs plan revenue will appear here."
        style={{ marginBottom: 16 }}
      />
      <Paragraph type="secondary">
        Admin shell is ready; usage logging hooks into the Claude client next.
      </Paragraph>
    </div>
  );
}
