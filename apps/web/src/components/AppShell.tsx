"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppstoreOutlined,
  AuditOutlined,
  CheckSquareOutlined,
  CreditCardOutlined,
  LogoutOutlined,
  MenuOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Drawer, Grid, Layout, Menu, Typography } from "antd";
import type { MenuProps } from "antd";
import AuthGuard from "@/components/AuthGuard";
import ProfileGate from "@/components/ProfileGate";
import SubscriptionGate from "@/components/SubscriptionGate";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutAndReset } from "@/store/session";

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { key: "/app", label: "Dashboard", icon: <AppstoreOutlined /> },
  { key: "/app/visibility", label: "Visibility", icon: <AuditOutlined /> },
  { key: "/app/action-plan", label: "Action plan", icon: <CheckSquareOutlined /> },
  { key: "/app/subscription", label: "Subscription", icon: <TeamOutlined /> },
  { key: "/app/billing", label: "Billing", icon: <CreditCardOutlined /> },
  { key: "/app/settings", label: "Settings", icon: <SettingOutlined /> },
];

function selectedKey(pathname: string | null): string {
  if (!pathname) return "/app";
  const match = NAV_ITEMS.map((item) => item.key)
    .filter((key) => key !== "/app")
    .find((key) => pathname === key || pathname.startsWith(`${key}/`));
  return match ?? "/app";
}

function pageTitle(pathname: string | null): string {
  const key = selectedKey(pathname);
  return NAV_ITEMS.find((item) => item.key === key)?.label ?? "Dashboard";
}

function userInitials(email?: string | null, businessName?: string | null): string {
  const source = businessName?.trim() || email?.trim() || "?";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function ShellBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/app" className={`app-shell-brand${compact ? " is-compact" : ""}`}>
      <span className="app-shell-brand-mark" aria-hidden>
        MA
      </span>
      <span className="app-shell-brand-copy">
        <span className="app-shell-brand-name">Master AEO</span>
        {!compact && <span className="app-shell-brand-tag">AI visibility</span>}
      </span>
    </Link>
  );
}

function ShellNav({
  pathname,
  onNavigate,
}: {
  pathname: string | null;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const active = selectedKey(pathname);

  const items: MenuProps["items"] = NAV_ITEMS.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
  }));

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[active]}
      items={items}
      className="app-shell-menu"
      onClick={({ key }) => {
        router.push(key);
        onNavigate?.();
      }}
    />
  );
}

function ShellSidebarFooter({ businessName }: { businessName?: string | null }) {
  if (!businessName?.trim()) return null;
  return (
    <div className="app-shell-sidebar-footer">
      <span className="app-shell-sidebar-footer-label">Business</span>
      <span className="app-shell-sidebar-footer-name">{businessName}</span>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const screens = Grid.useBreakpoint();
  const isDesktop = screens.lg ?? true;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const businessName = user?.business?.name;
  const title = pageTitle(pathname);
  const initials = userInitials(user?.email, businessName);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isDesktop) setMobileNavOpen(false);
  }, [isDesktop]);

  function onLogout() {
    void dispatch(logoutAndReset());
    router.replace("/login");
  }

  const nav = <ShellNav pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />;

  return (
    <AuthGuard>
      <SubscriptionGate>
        <ProfileGate>
          <Layout className="app-shell">
            {isDesktop ? (
              <Sider width={248} className="app-shell-sider" theme="dark">
                <ShellBrand />
                {nav}
                <ShellSidebarFooter businessName={businessName} />
              </Sider>
            ) : (
              <Drawer
                title={<ShellBrand compact />}
                placement="left"
                open={mobileNavOpen}
                onClose={() => setMobileNavOpen(false)}
                className="app-shell-drawer"
                width={280}
                styles={{ body: { padding: 0 } }}
              >
                {nav}
                <ShellSidebarFooter businessName={businessName} />
              </Drawer>
            )}

            <Layout className="app-shell-main">
              <Header className="app-shell-header">
                <div className="app-shell-header-start">
                  {!isDesktop && (
                    <Button
                      type="text"
                      className="app-shell-menu-btn"
                      icon={<MenuOutlined />}
                      aria-label="Open navigation"
                      onClick={() => setMobileNavOpen(true)}
                    />
                  )}
                  <div className="app-shell-header-titles">
                    <Text className="app-shell-header-eyebrow">Master AEO</Text>
                    <Text className="app-shell-header-title">{title}</Text>
                  </div>
                </div>

                <div className="app-shell-header-end">
                  <div className="app-shell-user">
                    <span className="app-shell-user-avatar" aria-hidden>
                      {initials}
                    </span>
                    <div className="app-shell-user-meta">
                      {businessName && (
                        <Text className="app-shell-user-business">{businessName}</Text>
                      )}
                      <Text type="secondary" className="app-shell-user-email">
                        {user?.email}
                      </Text>
                    </div>
                  </div>
                  <Button
                    type="default"
                    className="app-shell-logout"
                    icon={<LogoutOutlined />}
                    onClick={onLogout}
                  >
                    <span className="app-shell-logout-label">Log out</span>
                  </Button>
                </div>
              </Header>

              <Content className="app-shell-content">{children}</Content>
            </Layout>
          </Layout>
        </ProfileGate>
      </SubscriptionGate>
    </AuthGuard>
  );
}
