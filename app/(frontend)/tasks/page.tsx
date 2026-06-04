"use client";

import Image from "next/image";
import { use, useMemo } from "react";
import Link from "next/link";
import { useTaskSubscription } from "@/hooks/useTaskSubscription";

export default function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { tasks, connected, lastUpdate, toast } = useTaskSubscription();

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === id) || tasks[0] || null,
    [tasks, id],
  );

  return (
    <div className="flex h-screen bg-gray-50 relative">

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

      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">

        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">My Tasks</h1>
            <p className="text-xs text-gray-400">Assigned workspace</p>
            {lastUpdate && (
              <p className="text-[10px] text-gray-500 mt-1 font-mono">
                Updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
          <span
            className={`flex items-center gap-1.5 text-[0.6rem] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
              connected
                ? "text-green-700 bg-green-50 border border-green-200"
                : "text-red-700 bg-red-50 border border-red-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connected
                  ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse"
                  : "bg-red-500"
              }`}
            />
            {connected ? "Live Connected" : "Offline"}
          </span>
        </div>


        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className={`
                block p-3 rounded-xl transition
                border border-transparent
                hover:bg-gray-100
                ${task.id === id ? "bg-gray-100 border-gray-300" : ""}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-800 text-sm">
                  {task.title}
                </div>
                {task.subscribed && (
                  <span className="text-[0.55rem] font-mono font-bold uppercase tracking-wider text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                    sub
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full ${
                  task.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : task.status === "in-progress"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {task.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">

        {!selectedTask ? (
          <div className="text-gray-400 text-center mt-20">
            No tasks assigned
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">

              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  {selectedTask.title}
                </h1>
                {selectedTask.subscribed && (
                  <span className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
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

              <p className="mt-3 text-gray-600 leading-relaxed">
                {selectedTask.description}
              </p>

              <div className="my-6 border-t" />

              {selectedTask.taskPic?.url && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-2">Image</p>
                  <Image
                    src={selectedTask.taskPic.url}
                    alt={selectedTask.title}
                    width={800}
                    height={600}
                    className="rounded-xl w-full object-cover border"
                    style={{ height: "auto" }}
                  />
                </div>
              )}

              {selectedTask.taskDoc?.url && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-2">Document</p>
                  <iframe
                    src={selectedTask.taskDoc.url}
                    className="w-full h-[600px] rounded-xl border"
                  />
                </div>
              )}

              {selectedTask.taskVideo?.url && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Video</p>
                  <video controls className="w-full rounded-xl border">
                    <source src={selectedTask.taskVideo.url} />
                  </video>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
