"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TerminalComponent from "@/components/terminal";
import { runsApi } from "@/lib/api";

export default function AgentRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [run, setRun] = useState<any>(null);
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
    if (!token || !runId) return;

    async function load() {
      try {
        const data = await runsApi.list(token);
        const current = data.find((r: any) => r.id === runId);
        if (!current) {
          alert("Run not found");
          router.push("/agent-runs");
          return;
        }
        setRun(current);
      } catch (err: any) {
        console.error("Failed to load run:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token, runId, router]);

  async function handleStop() {
    if (!token || !runId) return;
    try {
      await runsApi.stop(token, runId);
      const data = await runsApi.list(token);
      const current = data.find((r: any) => r.id === runId);
      setRun(current);
    } catch (err: any) {
      alert(err.message || "Failed to stop run");
    }
  }

  async function handleRestart() {
    if (!token || !runId) return;
    try {
      await runsApi.restart(token, runId);
      const data = await runsApi.list(token);
      const current = data.find((r: any) => r.id === runId);
      setRun(current);
    } catch (err: any) {
      alert(err.message || "Failed to restart run");
    }
  }

  if (!token || loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!run) {
    return <div className="p-8">Run not found</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => router.push("/agent-runs")}
            className="text-blue-400 hover:underline mb-2"
          >
            ← Back to Runs
          </button>
          <h1 className="text-3xl font-bold">{run.agentTemplate?.name || "Unknown"}</h1>
          <p className="text-gray-400 text-sm mt-1">
            Created: {new Date(run.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex gap-3">
          {run.status === "running" && (
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Stop
            </button>
          )}
          {run.status === "stopped" && (
            <button
              onClick={handleRestart}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Restart
            </button>
          )}
        </div>
      </div>

      {/* Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Status</div>
          <div
            className={`text-lg font-medium mt-1 ${
              run.status === "running"
                ? "text-green-400"
                : run.status === "failed"
                  ? "text-red-400"
                  : run.status === "stopped"
                    ? "text-gray-400"
                    : "text-yellow-400"
            }`}
          >
            {run.status}
          </div>
        </div>

        <div className="border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Command</div>
          <div className="text-sm font-mono mt-1">{run.command} {run.args?.join(" ")}</div>
        </div>

        <div className="border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Box ID</div>
          <div className="text-sm font-mono mt-1">{run.boxId || "N/A"}</div>
        </div>
      </div>

      {/* Terminal */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Terminal</h2>
        <TerminalComponent runId={runId} token={token} />
      </div>

      {/* Events */}
      {run.events && run.events.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Events</h2>
          <div className="space-y-2">
            {run.events.map((event: any) => (
              <div key={event.id} className="border border-gray-800 rounded p-3 text-sm">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      event.level === "error"
                        ? "bg-red-900/50 text-red-400"
                        : event.level === "warn"
                          ? "bg-yellow-900/50 text-yellow-400"
                          : "bg-blue-900/50 text-blue-400"
                    }`}
                  >
                    {event.level}
                  </span>
                  <span className="text-gray-400">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1">{event.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
