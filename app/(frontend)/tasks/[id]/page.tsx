"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useMemo } from "react";
import { useTaskSubscription } from "@/hooks/useTaskSubscription";

export default function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { tasks, connected, lastUpdate, toast } = useTaskSubscription();

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === id) || null,
    [tasks, id],
  );

  return (
    <div className="flex h-screen bg-gray-100 relative">

      {/* Real-time Toast Notification Overlay */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl transition-all duration-300 animate-bounce ${
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : toast.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              toast.type === "success"
                ? "bg-green-500 shadow-[0_0_6px_#22c55e]"
                : toast.type === "error"
                ? "bg-red-500 shadow-[0_0_6px_#ef4444]"
                : "bg-blue-500 shadow-[0_0_6px_#3b82f6]"
            }`}
          />
          <span className="text-sm font-semibold tracking-wide">{toast.message}</span>
        </div>
      )}

      <div className="w-72 bg-gray-900 text-white p-5 flex flex-col justify-between">
        <div className="space-y-2 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">Tasks</h1>
              {lastUpdate && (
                <p className="text-[9px] text-gray-400 mt-1 font-mono">
                  Updated: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
            <span
              className={`flex items-center gap-1.5 text-[0.55rem] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                connected
                  ? "text-green-300 bg-green-950 border border-green-800"
                  : "text-red-300 bg-red-950 border border-red-800"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connected
                    ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)] animate-pulse"
                    : "bg-red-500"
                }`}
              />
              {connected ? "Live Connected" : "Offline"}
            </span>
          </div>


        {tasks.map((task) => (
          <Link
            key={task.id}
            href={`/tasks/${task.id}`}
            className={`block px-3 py-2 rounded-lg text-sm transition
              ${task.id === id ? "bg-gray-700" : "hover:bg-gray-800"}
            `}
          >
            <div className="flex items-center justify-between">
              <span>{task.title}</span>
              {task.subscribed && (
                <span className="text-[0.5rem] font-mono font-bold uppercase tracking-wider text-green-400 bg-green-900/40 px-1 py-0.5 rounded">
                  sub
                </span>
              )}
            </div>
          </Link>
        ))}
        </div>
      </div>

      <div className="flex-1 p-8 overflow-auto">

        {!selectedTask ? (
          <div className="text-gray-500">Select a task</div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl">

            <Link
              href="/tasks"
              className="inline-block mb-4 text-sm text-blue-600 hover:underline"
            >
              ← Back to tasks
            </Link>

            <div className="flex items-center justify-between">
              <h1 className="text-2xl text-red-900 font-bold mb-2">
                {selectedTask.title}
              </h1>
              {selectedTask.subscribed && (
                <span className="flex items-center gap-1.5 text-[0.6rem] font-mono font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
                  subscribed
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status:</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                selectedTask.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : selectedTask.status === "in-progress"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}>
                {selectedTask.status}
              </span>
            </div>

            <p className="text-gray-600 mb-6">
              {selectedTask.description}
            </p>

            {selectedTask.taskPic?.url && (
              <Image
                src={selectedTask.taskPic.url}
                alt={selectedTask.title}
                width={800}
                height={600}
                className="w-full rounded-lg mb-6"
                style={{ height: "auto" }}
              />
            )}

            {selectedTask.taskDoc?.url && (
              <iframe
                src={selectedTask.taskDoc.url}
                className="w-full h-[600px] rounded-lg mb-6 border"
              />
            )}

            {selectedTask.taskVideo?.url && (
              <video controls className="w-full rounded-lg">
                <source src={selectedTask.taskVideo.url} />
              </video>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
