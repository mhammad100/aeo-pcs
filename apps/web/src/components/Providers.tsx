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
                colorPrimary: "#d4844a",
                colorBgBase: "#0b1411",
                colorBgContainer: "#12201b",
                colorBgElevated: "#152420",
                colorText: "#f2efe6",
                colorTextSecondary: "#9aaba2",
                colorBorder: "rgba(143, 191, 159, 0.18)",
                colorSuccess: "#8fbf9f",
                colorWarning: "#d4844a",
                colorError: "#c96a5a",
                borderRadius: 8,
                fontFamily: "var(--ma-font-body)",
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
