import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { apiFetch } from "../utils/api";

const useNotifications = () => {
  const { user, token, API } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiFetch(`${API}/notifications?unreadOnly=true`);
      if (result && result.data) {
        setNotifications(result.data.notifications || []);
        setUnreadCount(result.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token || !user) return;

    fetchNotifications();

    let es = null;
    let reconnectTimeout = null;

    const connectSSE = () => {
      const url = `${API}/notifications/stream?token=${token}`;
      es = new EventSource(url);

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);

          if (data.type === "unread_count") {
            setUnreadCount(data.count);
            return;
          }

          if (!data.type) return;

          setNotifications((prev) => {
            // Avoid duplicates just in case
            if (prev.some((n) => n._id === data._id)) return prev;
            return [data, ...prev];
          });
          setUnreadCount((prev) => prev + 1);
        } catch (err) {
          console.error("SSE parse error", err);
        }
      };

      es.onerror = () => {
        es.close();
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (es) es.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [token, user, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await apiFetch(`${API}/notifications/${id}/read`, { method: "PATCH" });
    } catch (error) {
      console.error("Failed to mark as read", error);
      // Revert if error
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications([]);
      setUnreadCount(0);

      await apiFetch(`${API}/notifications/read-all`, { method: "PATCH" });
    } catch (error) {
      console.error("Failed to mark all as read", error);
      fetchNotifications();
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
};

export default useNotifications;
