"use client";

import { useEffect, useState, use } from "react";

export default function TasksPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            const res = await fetch("/api/tasks");
            const data = await res.json();
            setTasks(data.docs || []);
        };

        fetchTasks();
    }, []);

    useEffect(() => {
        if (!id) return;

        const fetchTask = async () => {
            setLoading(true);
            const res = await fetch(`/api/tasks/${id}?depth=2`);
            const data = await res.json();
            setSelectedTask(data);
            setLoading(false);
        };

        fetchTask();
    }, [id]);

    return (
        <div className="flex h-screen bg-gray-50">

            {/* SIDEBAR */}
            <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">

                {/* HEADER */}
                <div className="p-5 border-b">
                    <h1 className="text-xl font-bold text-gray-800">My Tasks</h1>
                    <p className="text-sm text-gray-500">Assigned workspace</p>
                </div>

                {/* TASK LIST */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {tasks.map((task) => (
                        <a
                            key={task.id}
                            href={`/tasks/${task.id}`}
                            className={`
                block p-3 rounded-xl transition
                border border-transparent
                hover:bg-gray-100
                ${task.id === id ? "bg-gray-100 border-gray-300" : ""}
              `}
                        >
                            <div className="font-medium text-gray-800 text-sm">
                                {task.title}
                            </div>

                            <div className="text-xs text-gray-400 mt-1">
                                Click to open
                            </div>
                        </a>
                    ))}
                </div>
            </aside>

            {/* MAIN VIEWER */}
            <main className="flex-1 p-8 overflow-y-auto">

                {!selectedTask ? (
                    <div className="text-gray-400 text-center mt-20">
                        Select a task to view details
                    </div>
                ) : loading ? (
                    <div className="text-gray-500">Loading...</div>
                ) : (
                    <div className="max-w-4xl mx-auto">

                        {/* CARD */}
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">

                            {/* TITLE */}
                            <h1 className="text-3xl font-bold text-gray-900">
                                {selectedTask.title}
                            </h1>

                            {/* DESCRIPTION */}
                            <p className="mt-3 text-gray-600 leading-relaxed">
                                {selectedTask.description}
                            </p>

                            {/* DIVIDER */}
                            <div className="my-6 border-t" />

                            {/* IMAGE */}
                            {selectedTask.taskPic?.url && (
                                <div className="mb-6">
                                    <p className="text-sm text-gray-500 mb-2">Image</p>
                                    <img
                                        src={selectedTask.taskPic.url}
                                        className="rounded-xl w-full object-cover border"
                                    />
                                </div>
                            )}

                            {/* PDF */}
                            {selectedTask.taskDoc?.url && (
                                <div className="mb-6">
                                    <p className="text-sm text-gray-500 mb-2">Document</p>
                                    <iframe
                                        src={selectedTask.taskDoc.url}
                                        className="w-full h-[600px] rounded-xl border"
                                    />
                                </div>
                            )}

                            {/* VIDEO */}
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