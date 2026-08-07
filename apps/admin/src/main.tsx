import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ConfigProvider, theme } from "antd";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { persistor, store } from "./store";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ConfigProvider
          theme={{
            algorithm: theme.darkAlgorithm,
            token: {
              colorPrimary: "#14B8A6",
              colorPrimaryHover: "#0F9E93",
              colorPrimaryActive: "#0D8A80",
              colorBgBase: "#0E1C35",
              colorBgContainer: "#0F1B30",
              colorBgElevated: "#1C2E50",
              colorText: "#FFFFFF",
              colorTextSecondary: "#7A9CC8",
              colorTextLightSolid: "#04342C",
              colorBorder: "#1E3255",
              colorSuccess: "#14B8A6",
              colorWarning: "#E8943A",
              colorError: "#E8535A",
              colorLink: "#14B8A6",
              colorLinkHover: "#0F9E93",
              borderRadius: 8,
              controlHeight: 44,
              controlHeightLG: 48,
              controlHeightSM: 36,
              fontFamily: "Inter, system-ui, sans-serif",
            },
            components: {
              Button: {
                primaryColor: "#04342C",
                colorPrimaryHover: "#0F9E93",
                colorPrimaryActive: "#0D8A80",
                borderRadius: 8,
                controlHeight: 44,
                fontWeight: 600,
                defaultBorderColor: "#3D5A80",
                defaultColor: "#7A9CC8",
                paddingInline: 22,
              },
              Card: {
                colorBgContainer: "#0F1B30",
                colorBorderSecondary: "#1E3255",
              },
              Menu: {
                darkItemBg: "#0F1B30",
                darkItemSelectedBg: "rgba(20, 184, 166, 0.12)",
                darkItemHoverBg: "rgba(20, 184, 166, 0.08)",
                darkItemColor: "#7A9CC8",
                darkItemSelectedColor: "#FFFFFF",
              },
              Layout: {
                bodyBg: "#0E1C35",
                headerBg: "#0F1B30",
                siderBg: "#0F1B30",
              },
              Input: {
                colorBgContainer: "#0E1C35",
                activeBorderColor: "#14B8A6",
                hoverBorderColor: "#0F9E93",
              },
              Table: {
                headerBg: "#1C2E50",
                rowHoverBg: "rgba(20, 184, 166, 0.06)",
                borderColor: "#1E3255",
              },
            },
          }}
        >
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConfigProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
