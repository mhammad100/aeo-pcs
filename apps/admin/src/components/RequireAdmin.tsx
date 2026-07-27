import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spin } from "antd";
import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout, setUser } from "@/store/authSlice";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.token);
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!token) {
        setReady(true);
        setAllowed(false);
        return;
      }
      try {
        const { user: me } = await api.me();
        if (cancelled) return;
        dispatch(setUser(me));
        setAllowed(me.role === "admin" && me.status === "active");
      } catch {
        if (!cancelled) {
          dispatch(logout());
          setAllowed(false);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [token, dispatch]);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!token || !allowed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // user may still be hydrating; RequireAdmin already verified role
  void user;
  return <>{children}</>;
}
