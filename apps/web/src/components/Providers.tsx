"use client";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ConfigProvider, theme } from "antd";
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
                colorPrimary: "#C9773D",
                colorBgBase: "#0F1A17",
                colorBgContainer: "#152420",
                colorText: "#EDEAE1",
                colorBorder: "#2B3B34",
                borderRadius: 8,
                fontFamily: "Georgia, 'Times New Roman', serif",
              },
            }}
          >
            {children}
          </ConfigProvider>
        </PersistGate>
      </Provider>
    </AntdRegistry>
  );
}
