import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { Button, Layout, Menu, Typography } from "antd";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/authSlice";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const items = [
  { key: "/", label: <Link to="/">Overview</Link> },
  { key: "/users", label: <Link to="/users">Users</Link> },
  { key: "/businesses", label: <Link to="/businesses">Businesses</Link> },
  { key: "/plans", label: <Link to="/plans">Plans</Link> },
  { key: "/usage", label: <Link to="/usage">Usage</Link> },
];

export default function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const selected =
    items.find((i) => i.key !== "/" && location.pathname.startsWith(i.key))?.key || "/";

  return (
    <Layout style={{ minHeight: "100vh", background: "#0F1A17" }}>
      <Sider breakpoint="lg" collapsedWidth={0} style={{ background: "#152420" }}>
        <div style={{ padding: 20 }}>
          <Text strong style={{ color: "#8FBF9F", letterSpacing: "0.06em" }}>
            masteraeo admin
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selected]}
          items={items}
          style={{ background: "#152420", borderInlineEnd: "none" }}
        />
      </Sider>
      <Layout style={{ background: "#0F1A17" }}>
        <Header
          style={{
            background: "#152420",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 16,
            paddingInline: 24,
          }}
        >
          <Text type="secondary">{user?.email}</Text>
          <Button
            onClick={() => {
              dispatch(logout());
              navigate("/login");
            }}
          >
            Log out
          </Button>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
