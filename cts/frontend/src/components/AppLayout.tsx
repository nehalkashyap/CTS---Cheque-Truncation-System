import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Chatbot from "./Chatbot";

export default function AppLayout({ title }: { title: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-ink-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <Chatbot />
    </div>
  );
}
