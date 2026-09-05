import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Headset, MessageSquareText } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";
import type { ChatMessage, SupportTicket } from "../types";
import { formatTime } from "../utils/format";
import EmptyState from "../components/EmptyState";

export default function Support() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { show } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get<ChatMessage[]>("/chat/messages").then(setMessages);
    api.get<SupportTicket[]>("/support/tickets").then(setTickets);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(content: string) {
    if (!content.trim() || sending) return;
    setSending(true);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content, created_at: new Date().toISOString(), quick_actions: [] }]);
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
      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
      try {
        const ticket = await api.post<SupportTicket>("/support/tickets", {
          reason: lastAssistant?.content?.slice(0, 120) || "General assistance",
        });
        setTickets((t) => [ticket, ...t]);
        show(`Ticket ${ticket.display_id} created.`, "success");
      } catch {
        show("Couldn't create a ticket right now.", "error");
      }
    } else if (action === "Upload Cheque") {
      navigate("/cheques/add");
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_20rem] gap-6 pb-10">
      <div className="ledger-card flex flex-col h-[36rem] max-h-[70vh]">
        <div className="flex items-center gap-2.5 px-5 py-4 ledger-divider">
          <div className="w-8 h-8 rounded-full bg-gold-500/15 border border-gold-500/40 flex items-center justify-center text-gold-500">
            <Sparkles size={15} />
          </div>
          <div>
            <p className="text-sm font-semibold text-cream">CTS Assistant</p>
            <p className="text-xs text-mist">Your cheque processing guide</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                m.role === "user" ? "bg-gold-500 text-ink-950" : "bg-ink-800 border border-ink-border text-cream"
              }`}>
                {m.content}
                {m.quick_actions?.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2.5">
                    {m.quick_actions.map((a) => (
                      <button key={a} onClick={() => handleQuickAction(a)} className="flex items-center gap-1.5 text-xs font-semibold text-gold-500 border border-gold-500/40 rounded-sm px-2.5 py-1.5 hover:bg-gold-500/10 self-start">
                        {a === "Create Support Ticket" && <Headset size={12} />}
                        {a}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 px-4 py-3.5 ledger-divider">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about a cheque…" className="input-field" />
          <button type="submit" disabled={sending} className="btn-primary !px-3.5">
            <Send size={15} />
          </button>
        </form>
      </div>

      <div className="ledger-card p-5">
        <h3 className="font-display text-lg text-cream mb-4">Support tickets</h3>
        {tickets.length === 0 ? (
          <EmptyState
            icon={<MessageSquareText size={18} />}
            title="No tickets yet"
            description="Escalate a conversation with the assistant to create one."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map((t) => (
              <div key={t.id} className="bg-ink-950 border border-ink-border rounded-sm p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs text-gold-500">{t.display_id}</span>
                  <span className="text-xs text-mist font-mono">{t.priority}</span>
                </div>
                <p className="text-sm text-cream mb-1.5">{t.reason}</p>
                <div className="flex items-center justify-between text-xs text-mist">
                  <span>{t.status.replace(/_/g, " ")}</span>
                  <span className="font-mono">{formatTime(t.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
