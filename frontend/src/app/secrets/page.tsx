"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { secretsApi } from "@/lib/api";

export default function SecretsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [secrets, setSecrets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

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
    loadSecrets();
  }, [token]);

  async function loadSecrets() {
    try {
      const data = await secretsApi.list(token!);
      setSecrets(data);
    } catch (err: any) {
      console.error("Failed to load secrets:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this secret?")) return;
    try {
      await secretsApi.remove(token, id);
      loadSecrets();
    } catch (err: any) {
      alert(err.message || "Failed to delete secret");
    }
  }

  if (!token || loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Add Secret
        </button>
      </div>

      {secrets.length === 0 ? (
        <div className="text-gray-400 text-center py-12 border border-gray-800 rounded-lg">
          No secrets yet. Add one to use with your agents.
        </div>
      ) : (
        <div className="space-y-4">
          {secrets.map((secret) => (
            <div
              key={secret.id}
              className="border border-gray-800 rounded-lg p-5 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{secret.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  Provider: {secret.provider}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {secret.lastFour}
                </div>
              </div>

              <button
                onClick={() => handleDelete(secret.id)}
                className="text-sm px-3 py-1 border border-red-700 text-red-400 rounded hover:bg-red-900/30"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateSecretModal
          token={token}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            loadSecrets();
          }}
        />
      )}
    </div>
  );
}

function CreateSecretModal({
  token,
  onClose,
  onSuccess,
}: {
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("openai");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await secretsApi.create(token, { name, provider, value });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create secret");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Secret</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My OpenAI Key"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
              <option value="github">GitHub</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Value</label>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter secret value"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 p-3 border border-gray-700 rounded-lg hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
