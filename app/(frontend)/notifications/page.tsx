"use client";

import { useEffect, useState } from "react";

interface Notification {
    id: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    read: boolean;
    createdAt: string;
}

const typeStyles: Record<string, string> = {
    info: "bg-blue-100 text-blue-700 border-blue-200",
    success: "bg-green-100 text-green-700 border-green-200",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
    error: "bg-red-100 text-red-700 border-red-200",
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/notifications?depth=0&limit=100&sort=-createdAt", {
            credentials: "include",
        })
            .then((res) => {
                if (!res.ok) throw new Error(`Failed to load notifications (${res.status})`);
                return res.json();
            })
            .then((data) => {
                setNotifications(data.docs || []);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message || "Failed to load notifications");
                setLoading(false);
            });
    }, []);

    const markAsRead = async (id: string) => {
        try {
            const res = await fetch(`/api/notifications/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ read: true }),
                credentials: "include",
            });
            if (!res.ok) throw new Error(`Failed to update notification (${res.status})`);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
            );
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to mark notification as read");
            setTimeout(() => setError(null), 4000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-gray-400 text-sm">Loading notifications...</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-8 py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
            <p className="text-sm text-gray-400 mb-8">
                {notifications.filter((n) => !n.read).length} unread
            </p>

            {error && (
                <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium ml-4"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {notifications.length === 0 ? (
                <p className="text-gray-400 text-sm">No notifications yet.</p>
            ) : (
                <div className="space-y-3">
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            className={`p-5 rounded-xl border transition ${n.read
                                    ? "bg-gray-50 border-gray-200"
                                    : "bg-white border-gray-300 shadow-sm"
                                }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span
                                            className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full border ${typeStyles[n.type]}`}
                                        >
                                            {n.type}
                                        </span>
                                        {!n.read && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-800 leading-relaxed break-words">
                                        {n.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-2 font-mono">
                                        {new Date(n.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                {!n.read && (
                                    <button
                                        onClick={() => markAsRead(n.id)}
                                        className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        Mark as read
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
