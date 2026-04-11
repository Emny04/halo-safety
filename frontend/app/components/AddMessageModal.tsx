"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

interface AddMessageModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (msg: { sender: string; subject: string; body: string; type: string }) => void;
}

export default function AddMessageModal({ open, onClose, onSubmit }: AddMessageModalProps) {
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("email");

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sender.trim() || !body.trim()) return;
    onSubmit({ sender: sender.trim(), subject: subject.trim() || "No subject", body: body.trim(), type });
    setSender("");
    setSubject("");
    setBody("");
    setType("email");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-xl border shadow-xl w-full max-w-lg mx-4 animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold">Add New Message</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="type"
                value="email"
                checked={type === "email"}
                onChange={(e) => setType(e.target.value)}
                className="accent-primary"
              />
              Email
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="type"
                value="sms"
                checked={type === "sms"}
                onChange={(e) => setType(e.target.value)}
                className="accent-primary"
              />
              SMS
            </label>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">
              Sender
            </label>
            <input
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="e.g. suspicious@example.com"
              className="mt-1 w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. You have won a prize!"
              className="mt-1 w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">
              Message Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste the email or SMS text here…"
              rows={5}
              className="mt-1 w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add & Analyze
          </button>
        </form>
      </div>
    </div>
  );
}
