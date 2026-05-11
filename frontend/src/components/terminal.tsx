"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { io, Socket } from "socket.io-client";

interface TerminalProps {
  runId: string;
  token: string;
}

export default function TerminalComponent({ runId, token }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new Terminal({
      theme: {
        background: "#1a1a1a",
        foreground: "#ffffff",
        cursor: "#ffffff",
      },
      fontSize: 14,
      fontFamily: "monospace",
      cols: 80,
      rows: 24,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    terminalInstance.current = term;

    // Connect to WebSocket
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const socket = io(`${API_URL}/ws/agent-runs`, {
      auth: { token },
      query: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    // Handle connection
    socket.on("connect", () => {
      setConnected(true);
      term.writeln("\x1b[32m[Connected to terminal]\x1b[0m\r\n");

      // Attach to run
      socket.emit("attach", { runId });
    });

    // Handle output
    socket.on("output", (data: { data: string }) => {
      term.write(data.data);
    });

    // Handle status
    socket.on("status", (data: { status: string; [key: string]: any }) => {
      term.writeln(`\r\n\x1b[33m[Status: ${data.status}]\x1b[0m\r\n`);
    });

    // Handle error
    socket.on("error", (data: { message: string }) => {
      term.writeln(`\r\n\x1b[31m[Error: ${data.message}]\x1b[0m\r\n`);
    });

    // Handle pong
    socket.on("pong", () => {
      // Keep-alive
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      setConnected(false);
      term.writeln("\r\n\x1b[31m[Disconnected]\x1b[0m\r\n");
    });

    // Send input to terminal
    term.onData((data) => {
      if (socket.connected) {
        socket.emit("input", { input: data });
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims && socket.connected) {
        socket.emit("resize", { cols: dims.cols, rows: dims.rows });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      socket.disconnect();
      term.dispose();
    };
  }, [runId, token]);

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <span
          className={`px-2 py-1 rounded text-xs ${
            connected ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
          }`}
        >
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <div ref={terminalRef} className="h-[600px] rounded-lg overflow-hidden" />
    </div>
  );
}
