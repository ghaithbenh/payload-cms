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
        <div className="flex h-screen bg-gray-100">

            {/* SIDEBAR */}
            <div className="w-72 bg-gray-900 text-white p-5 space-y-2">
                <h1 className="text-xl font-bold mb-4">Tasks</h1>

                {tasks.map((task) => (
                    <a
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className={`block px-3 py-2 rounded-lg text-sm transition
              ${task.id === id ? "bg-gray-700" : "hover:bg-gray-800"}
            `}
                    >
                        {task.title}
                    </a>
                ))}
            </div>

            {/* MAIN */}
            <div className="flex-1 p-8 overflow-auto">

                {!selectedTask ? (
                    <div className="text-gray-500">Select a task</div>
                ) : loading ? (
                    <div className="text-gray-500">Loading...</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl">

                        {/* BACK BUTTON */}
                        <a
                            href="/tasks"
                            className="inline-block mb-4 text-sm text-blue-600 hover:underline"
                        >
                            ← Back to tasks
                        </a>

                        {/* TITLE */}
                        <h1 className="text-2xl text-red-900 font-bold mb-2">
                            {selectedTask.title}
                        </h1>

                        {/* DESCRIPTION */}
                        <p className="text-gray-600 mb-6">
                            {selectedTask.description}
                        </p>

                        {/* IMAGE */}
                        {selectedTask.taskPic?.url && (
                            <img
                                src={selectedTask.taskPic.url}
                                className="w-full rounded-lg mb-6"
                            />
                        )}

                        {/* PDF */}
                        {selectedTask.taskDoc?.url && (
                            <iframe
                                src={selectedTask.taskDoc.url}
                                className="w-full h-[600px] rounded-lg mb-6 border"
                            />
                        )}

                        {/* VIDEO */}
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