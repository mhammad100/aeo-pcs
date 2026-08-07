import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { Button, Layout, Menu, Typography } from "antd";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { api } from "@/lib/api";
import { logout } from "@/store/authSlice";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const items = [
  { key: "/", label: <Link to="/">Overview</Link> },
  { key: "/users", label: <Link to="/users">Users</Link> },
  { key: "/businesses", label: <Link to="/businesses">Businesses</Link> },
  { key: "/plans", label: <Link to="/plans">Plans</Link> },
  { key: "/usage", label: <Link to="/usage">Usage</Link> },
  { key: "/settings", label: <Link to="/settings">Settings</Link> },
];

function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="6" y="6" width="88" height="88" rx="20" fill="#16233E" />
      <polyline
        points="26,74 26,26 50,54 74,26 74,74"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="88" cy="8" r="10" fill="#14B8A6" />
    </svg>
  );
}

export default function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const selected =
    items.find((i) => i.key !== "/" && location.pathname.startsWith(i.key))?.key || "/";

  return (
    <Layout style={{ minHeight: "100vh", background: "#0E1C35" }}>
      <Sider breakpoint="lg" collapsedWidth={0} style={{ background: "#0F1B30", borderInlineEnd: "1px solid #1E3255" }}>
        <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <BrandMark />
          <div>
            <Text strong style={{ color: "#FFFFFF", display: "block", lineHeight: 1.2 }}>
              Master<span style={{ color: "#14B8A6" }}>AEO</span>
            </Text>
            <Text style={{ color: "#7A9CC8", fontSize: 10, letterSpacing: "0.18em" }}>ADMIN</Text>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selected]}
          items={items}
          style={{ background: "#0F1B30", borderInlineEnd: "none" }}
        />
      </Sider>
      <Layout style={{ background: "#0E1C35" }}>
        <Header
          style={{
            background: "#0F1B30",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 16,
            paddingInline: 24,
            borderBottom: "1px solid #1E3255",
          }}
        >
          <Text type="secondary">{user?.email}</Text>
          <Button
            onClick={() => {
              void (async () => {
                try {
                  await api.logout();
                } catch {
                  /* proceed with local logout */
                }
                dispatch(logout());
                navigate("/login");
              })();
            }}
          >
            Log out
          </Button>
        </Header>
        <Content
          style={{
            padding: 24,
            backgroundImage:
              "repeating-linear-gradient(to right,rgba(26,46,80,0.3) 0px,rgba(26,46,80,0.3) 1px,transparent 1px,transparent 60px),repeating-linear-gradient(to bottom,rgba(26,46,80,0.3) 0px,rgba(26,46,80,0.3) 1px,transparent 1px,transparent 60px)",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
