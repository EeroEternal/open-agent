import { redirect } from "next/navigation";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4">Open Agent</h1>
      <p className="text-lg text-gray-400 mb-8">
        AI Agent Running Platform
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-6 py-3 border border-gray-600 rounded-lg hover:bg-gray-800"
        >
          Register
        </Link>
      </div>
    </div>
  );
}
