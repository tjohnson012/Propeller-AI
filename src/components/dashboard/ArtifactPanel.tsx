"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { X, Download, Copy, Check, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { exportArtifact, copyArtifactToClipboard } from "@/lib/documents/export-utils";

function renderContent(content: string, type: string) {
  if (type === "table") {
    // Parse markdown table
    const lines = content.trim().split("\n");
    if (lines.length < 3) {
      return <pre className="text-sm text-text-secondary whitespace-pre-wrap">{content}</pre>;
    }

    const headers = lines[0]
      .split("|")
      .map((h) => h.trim())
      .filter(Boolean);
    const rows = lines.slice(2).map((line) =>
      line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean)
    );

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-hover">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="text-left px-3 py-2 text-text-secondary font-medium text-xs"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={
                  i % 2 === 0 ? "bg-bg-surface" : "bg-bg-secondary"
                }
              >
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-text-primary text-xs">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Document & report: render with simple markdown-like styling
  const sections = content.split("\n");
  return (
    <div className="space-y-1 text-sm">
      {sections.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="text-text-primary font-semibold text-base mt-4 mb-2">
              {line.replace("## ", "")}
            </h3>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h4 key={i} className="text-text-primary font-medium mt-3 mb-1">
              {line.replace("### ", "")}
            </h4>
          );
        }
        if (line.startsWith("---")) {
          return <hr key={i} className="border-border-primary my-3" />;
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="text-text-primary font-medium mt-2">
              {line.replace(/\*\*/g, "")}
            </p>
          );
        }
        if (line.startsWith("- **")) {
          const parts = line.replace("- **", "").split("**");
          return (
            <p key={i} className="text-text-secondary pl-3">
              <span className="text-text-primary font-medium">{parts[0]}</span>
              {parts.slice(1).join("")}
            </p>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <p key={i} className="text-text-secondary pl-3">
              {line.replace("- ", "• ")}
            </p>
          );
        }
        if (line.startsWith("**")) {
          const bold = line.match(/\*\*(.+?)\*\*/)?.[1] || "";
          const rest = line.replace(/\*\*(.+?)\*\*/, "");
          return (
            <p key={i} className="text-text-secondary">
              <span className="text-text-primary font-medium">{bold}</span>
              {rest}
            </p>
          );
        }
        if (line.trim() === "") {
          return <div key={i} className="h-1" />;
        }
        return (
          <p key={i} className="text-text-secondary leading-relaxed">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export function ArtifactPanel() {
  const { selectedArtifact, artifactPanelOpen, setArtifactPanelOpen } =
    useAppStore();
  const [copied, setCopied] = useState(false);

  const handleExport = () => {
    if (!selectedArtifact) return;
    exportArtifact(selectedArtifact);
  };

  const handleCopy = async () => {
    if (!selectedArtifact) return;
    const ok = await copyArtifactToClipboard(selectedArtifact);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {artifactPanelOpen && selectedArtifact && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 480, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full border-l border-border-primary bg-bg-secondary flex flex-col overflow-hidden shrink-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-medium text-text-primary truncate">
                {selectedArtifact.title}
              </h3>
              <Badge className="shrink-0">{selectedArtifact.type}</Badge>
            </div>
            <button
              onClick={() => setArtifactPanelOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {renderContent(selectedArtifact.content, selectedArtifact.type)}
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border-primary shrink-0">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {selectedArtifact.type === "table" ? "Export CSV" : "Export"}
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors">
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
