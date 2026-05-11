"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { templatesApi, runsApi } from "@/lib/api";

export default function AgentTemplatesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
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
    loadTemplates();
  }, [token]);

  async function loadTemplates() {
    try {
      const data = await templatesApi.list();
      setTemplates(data);
    } catch (err: any) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRun(templateId: string) {
    if (!token) return;
    try {
      await runsApi.create(token, { agentTemplateId: templateId });
      router.push("/agent-runs");
    } catch (err: any) {
      alert(err.message || "Failed to create run");
    }
  }

  if (!token || loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Agent Templates</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="border border-gray-800 rounded-lg p-6 hover:border-gray-600"
          >
            <h2 className="text-xl font-medium mb-2">{template.name}</h2>
            <p className="text-gray-400 text-sm mb-4">{template.description}</p>

            <div className="space-y-2 text-sm text-gray-500 mb-6">
              <div>Image: <code className="text-gray-300">{template.image}</code></div>
              <div>Command: <code className="text-gray-300">{template.defaultCommand}</code></div>
              {template.workingDir && (
                <div>Working Dir: <code className="text-gray-300">{template.workingDir}</code></div>
              )}
              {template.requiredSecrets?.length > 0 && (
                <div>Requires: <span className="text-yellow-400">{template.requiredSecrets.join(", ")}</span></div>
              )}
              <div>
                Resources: {template.cpuLimit || "?"} CPU, {template.memoryLimit || "?"}MB RAM, {template.diskSize || "?"}GB disk
              </div>
            </div>

            <button
              onClick={() => handleCreateRun(template.id)}
              className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Start Run
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
