"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { runsApi, templatesApi } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
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

    async function load() {
      try {
        const [runsData, templatesData] = await Promise.all([
          runsApi.list(token),
          templatesApi.list(),
        ]);
        setRuns(runsData);
        setTemplates(templatesData);
      } catch (err: any) {
        console.error("Failed to load:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  const handleCreateRun = async (templateId: string) => {
    if (!token) return;

    try {
      await runsApi.create(token, { agentTemplateId: templateId });
      const runsData = await runsApi.list(token);
      setRuns(runsData);
    } catch (err: any) {
      alert(err.message || "Failed to create run");
    }
  };

  if (!token || loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Recent Runs */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Runs</h2>
          <Link href="/agent-runs" className="text-blue-400 hover:underline">
            View All
          </Link>
        </div>

        {runs.length === 0 ? (
          <div className="text-gray-400 text-center py-8 border border-gray-800 rounded-lg">
            No runs yet. Create one from Templates.
          </div>
        ) : (
          <div className="space-y-3">
            {runs.slice(0, 5).map((run) => (
              <Link
                key={run.id}
                href={`/agent-runs/${run.id}`}
                className="block p-4 border border-gray-800 rounded-lg hover:border-gray-600"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{run.agentTemplate?.name || "Unknown"}</span>
                    <span className="ml-3 text-sm text-gray-400">
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                  </div>
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Available Templates */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Available Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="border border-gray-800 rounded-lg p-5 hover:border-gray-600"
            >
              <h3 className="text-lg font-medium mb-2">{t.name}</h3>
              <p className="text-gray-400 text-sm mb-3">{t.description}</p>
              <div className="text-xs text-gray-500 mb-4">
                <div>Image: {t.image}</div>
                <div>Command: {t.defaultCommand}</div>
                {t.requiredSecrets?.length > 0 && (
                  <div>Requires: {t.requiredSecrets.join(", ")}</div>
                )}
              </div>
              <button
                onClick={() => handleCreateRun(t.id)}
                className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Start Run
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
