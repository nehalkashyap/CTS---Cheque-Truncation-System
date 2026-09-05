import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send, Headset } from "lucide-react";
import { api } from "../lib/api";
import type { ChatMessage } from "../types";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { show } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open && messages.length === 0) {
      api.get<ChatMessage[]>("/chat/messages").then(setMessages).catch(() => {});
    }
  }, [open, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(content: string) {
    if (!content.trim() || sending) return;
    setSending(true);
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
      quick_actions: [],
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    try {
      const reply = await api.post<ChatMessage>("/chat/messages", { content });
      setMessages((m) => [...m, reply]);
    } catch {
      show("CTS Assistant is temporarily unavailable.", "error");
    } finally {
      setSending(false);
    }
  }

  async function handleQuickAction(action: string) {
    if (action === "Create Support Ticket") {
      try {
        const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
        await api.post("/support/tickets", { reason: lastAssistant?.content?.slice(0, 120) || "General assistance" });
        show("Support ticket created. A CTS agent will respond shortly.", "success");
      } catch {
        show("Couldn't create a ticket right now.", "error");
      }
    } else if (action === "Upload Cheque") {
      setOpen(false);
      navigate("/cheques/add");
    }
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-gold-500 text-ink-950 rounded-full px-4 py-3 shadow-card font-semibold text-sm hover:bg-gold-400 transition-colors"
      >
        {open ? <X size={18} /> : <Sparkles size={18} />}
        <span className="hidden sm:inline">CTS Assistant</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-20 right-5 z-40 w-[23rem] max-w-[92vw] h-[32rem] max-h-[75vh] ledger-card shadow-card flex flex-col sm:bottom-24 sm:right-5"
          >
            <div className="flex items-center gap-2.5 px-4 py-3.5 ledger-divider">
              <div className="w-8 h-8 rounded-full bg-gold-500/15 border border-gold-500/40 flex items-center justify-center text-gold-500">
                <Sparkles size={15} />
              </div>
              <div>
                <p className="text-sm font-semibold text-cream">CTS Assistant</p>
                <p className="text-[11px] text-mist">Your cheque processing guide</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-md px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                      m.role === "user"
                        ? "bg-gold-500 text-ink-950"
                        : "bg-ink-800 text-cream border border-ink-border"
                    }`}
                  >
                    {m.content}
                    {m.quick_actions?.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-2.5">
                        {m.quick_actions.map((action) => (
                          <button
                            key={action}
                            onClick={() => handleQuickAction(action)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gold-500 border border-gold-500/40 rounded-sm px-2.5 py-1.5 hover:bg-gold-500/10 transition-colors self-start"
                          >
                            {action === "Create Support Ticket" && <Headset size={12} />}
                            {action}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-ink-800 border border-ink-border rounded-md px-3.5 py-2.5 text-sm text-mist">
                    Typing…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 px-3 py-3 ledger-divider"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a cheque…"
                className="input-field !py-2"
              />
              <button type="submit" className="btn-primary !px-3 !py-2" disabled={sending}>
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
