"use client";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { App, ConfigProvider, theme } from "antd";
import { store, persistor } from "@/store";
import AntdRegistry from "./AntdRegistry";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ConfigProvider
            theme={{
              algorithm: theme.darkAlgorithm,
              token: {
                colorPrimary: "#14B8A6",
                colorPrimaryHover: "#0F9E93",
                colorPrimaryActive: "#0d8a80",
                colorBgBase: "#0E1C35",
                colorBgContainer: "#16233E",
                colorBgElevated: "#1C2E50",
                colorText: "#EDEFF6",
                colorTextSecondary: "#7A9CC8",
                colorTextLightSolid: "#04342C",
                colorBorder: "rgba(61, 90, 128, 0.45)",
                colorSuccess: "#14B8A6",
                colorWarning: "#E8943A",
                colorError: "#E8535A",
                colorLink: "#14B8A6",
                colorLinkHover: "#0F9E93",
                borderRadius: 8,
                controlHeight: 44,
                controlHeightLG: 48,
                controlHeightSM: 36,
                fontFamily: "var(--ma-font-body)",
              },
              components: {
                Button: {
                  primaryColor: "#04342C",
                  colorPrimaryHover: "#0F9E93",
                  colorPrimaryActive: "#0d8a80",
                  borderRadius: 8,
                  controlHeight: 44,
                  controlHeightLG: 48,
                  controlHeightSM: 36,
                  fontWeight: 600,
                  defaultBorderColor: "#3D5A80",
                  defaultColor: "#7A9CC8",
                  defaultHoverBorderColor: "#14B8A6",
                  defaultHoverColor: "#EDEFF6",
                  defaultHoverBg: "transparent",
                  paddingInline: 22,
                  paddingBlock: 10,
                },
                Input: {
                  activeBorderColor: "#14B8A6",
                  hoverBorderColor: "#0F9E93",
                  colorBgContainer: "#0E1C35",
                  activeShadow: "0 0 0 2px rgba(20, 184, 166, 0.18)",
                  paddingBlock: 10,
                  paddingInline: 14,
                },
                Select: {
                  colorBgContainer: "#0E1C35",
                  controlHeight: 44,
                  optionSelectedBg: "rgba(20, 184, 166, 0.12)",
                },
                Card: {
                  colorBgContainer: "#16233E",
                  colorBorderSecondary: "rgba(61, 90, 128, 0.45)",
                },
                Menu: {
                  darkItemBg: "#16233E",
                  darkSubMenuItemBg: "#16233E",
                  darkItemSelectedBg: "rgba(20, 184, 166, 0.12)",
                  darkItemHoverBg: "rgba(20, 184, 166, 0.08)",
                  darkItemColor: "#7A9CC8",
                  darkItemSelectedColor: "#EDEFF6",
                },
                Layout: {
                  bodyBg: "#0E1C35",
                  headerBg: "#16233E",
                  siderBg: "#16233E",
                  triggerBg: "#1C2E50",
                },
                Table: {
                  headerBg: "#1C2E50",
                  rowHoverBg: "rgba(20, 184, 166, 0.06)",
                  borderColor: "rgba(61, 90, 128, 0.45)",
                },
              },
            }}
          >
            <App>{children}</App>
          </ConfigProvider>
        </PersistGate>
      </Provider>
    </AntdRegistry>
  );
}
