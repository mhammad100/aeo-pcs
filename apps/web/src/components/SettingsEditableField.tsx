"use client";

import { EditOutlined } from "@ant-design/icons";
import { Button } from "antd";

type Props = {
  label: string;
  editing: boolean;
  saving?: boolean;
  empty?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  children: React.ReactNode;
  display: React.ReactNode;
  hint?: string;
};

export default function SettingsEditableField({
  label,
  editing,
  saving,
  empty,
  onEdit,
  onCancel,
  onSave,
  children,
  display,
  hint,
}: Props) {
  return (
    <div className={`settings-field-row${editing ? " is-editing" : ""}`}>
      <div className="settings-field-row-head">
        <span className="settings-field-label">{label}</span>
        {!editing && (
          <Button
            type="text"
            size="small"
            className="settings-field-edit-btn"
            icon={<EditOutlined />}
            onClick={onEdit}
          >
            Edit
          </Button>
        )}
      </div>

      {hint && !editing && <p className="settings-field-hint">{hint}</p>}

      {!editing ? (
        <div className={`settings-field-value${empty ? " is-empty" : ""}`}>
          {empty ? <span className="settings-view-empty">Not set</span> : display}
        </div>
      ) : (
        <div className="settings-field-edit">
          {children}
          <div className="settings-field-edit-actions">
            <Button size="small" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button size="small" type="primary" loading={saving} onClick={onSave}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
