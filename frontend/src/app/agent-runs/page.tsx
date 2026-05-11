"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { runsApi } from "@/lib/api";

export default function AgentRunsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return;
    }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    loadRuns();
  }, [token]);

  async function loadRuns() {
    try {
      const data = await runsApi.list(token!);
      setRuns(data);
    } catch (err: any) {
      console.error("Failed to load runs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStop(id: string) {
    if (!token) return;
    try {
      await runsApi.stop(token, id);
      loadRuns();
    } catch (err: any) {
      alert(err.message || "Failed to stop run");
    }
  }

  async function handleRestart(id: string) {
    if (!token) return;
    try {
      await runsApi.restart(token, id);
      loadRuns();
    } catch (err: any) {
      alert(err.message || "Failed to restart run");
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this run?")) return;
    try {
      await runsApi.remove(token, id);
      loadRuns();
    } catch (err: any) {
      alert(err.message || "Failed to delete run");
    }
  }

  if (!token || loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Runs</h1>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + New Run
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="text-gray-400 text-center py-12 border border-gray-800 rounded-lg">
          No runs yet. Go to{" "}
          <Link href="/dashboard" className="text-blue-400 hover:underline">
            Dashboard
          </Link>{" "}
          to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <div
              key={run.id}
              className="border border-gray-800 rounded-lg p-5 hover:border-gray-600"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/agent-runs/${run.id}`}
                    className="text-lg font-medium hover:text-blue-400"
                  >
                    {run.agentTemplate?.name || "Unknown"}
                  </Link>
                  <div className="text-sm text-gray-400 mt-1">
                    {new Date(run.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded text-sm ${
                      run.status === "running"
                        ? "bg-green-900/50 text-green-400"
                        : run.status === "failed"
                          ? "bg-red-900/50 text-red-400"
                          : run.status === "stopped"
                            ? "bg-gray-800 text-gray-400"
                            : "bg-yellow-900/50 text-yellow-400"
                    }`}
                  >
                    {run.status}
                  </span>

                  <div className="flex gap-2">
                    {run.status === "running" && (
                      <button
                        onClick={() => handleStop(run.id)}
                        className="text-sm px-3 py-1 border border-red-700 text-red-400 rounded hover:bg-red-900/30"
                      >
                        Stop
                      </button>
                    )}
                    {run.status === "stopped" && (
                      <button
                        onClick={() => handleRestart(run.id)}
                        className="text-sm px-3 py-1 border border-green-700 text-green-400 rounded hover:bg-green-900/30"
                      >
                        Restart
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(run.id)}
                      className="text-sm px-3 py-1 border border-gray-700 text-gray-400 rounded hover:bg-gray-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
