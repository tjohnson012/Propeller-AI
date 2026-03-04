"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { parseCSV, type ParsedProduct } from "@/lib/csv-parser";
import { useAppStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/store";
import { cn } from "@/lib/utils";

interface CatalogUploadProps {
  onComplete?: () => void;
}

export function CatalogUpload({ onComplete }: CatalogUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { setMessages, setSetupComplete, setProductProfile } = useAppStore();

  const handleFile = useCallback((f: File) => {
    if (!f.name.match(/\.(csv|tsv|txt)$/i)) {
      setParseErrors(["Please upload a CSV file"]);
      return;
    }

    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSV(text);
      setProducts(result.products);
      setParseErrors(result.errors);
    };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleProcess = async () => {
    if (products.length === 0) return;
    setProcessing(true);

    try {
      const response = await fetch("/api/catalog/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: products.map((p) => ({
            name: p.name,
            description: p.description,
            sku: p.sku,
            category: p.category,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setParseErrors([data.error || "Processing failed"]);
        return;
      }

      // Set profile from catalog
      setProductProfile({
        companyName: "",
        category: products[0]?.category || "Imported Catalog",
        products: products.map((p) => p.name).slice(0, 5).join(", "),
        targetMarkets: [],
      });

      // Create messages showing the results
      const msgs: ChatMessage[] = [
        {
          id: `sys-${Date.now()}`,
          role: "system",
          text: `Processed ${data.totalProcessed} products from ${file?.name}`,
          timestamp: new Date(),
        },
        {
          id: `agent-${Date.now()}`,
          role: "agent",
          agentId: "market",
          text: data.summary,
          timestamp: new Date(),
          artifact: {
            type: "table",
            title: `Catalog Analysis: ${file?.name}`,
            content: data.summary.split("\n").filter((l: string) => l.startsWith("|")).join("\n"),
          },
        },
      ];

      setMessages(msgs);
      setProcessed(true);
      onComplete?.();
    } catch (err) {
      setParseErrors(["Failed to process catalog. Check your connection."]);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setProducts([]);
    setParseErrors([]);
    setProcessed(false);
  };

  // File selected, show preview
  if (file && products.length > 0 && !processed) {
    return (
      <div className="animation-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-muted flex items-center justify-center">
              <FileText className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm text-text-primary font-medium">{file.name}</p>
              <p className="text-xs text-text-tertiary">{products.length} products found</p>
            </div>
          </div>
          <button onClick={reset} className="text-text-muted hover:text-text-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {parseErrors.length > 0 && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-agent-finance-muted mb-4">
            <AlertTriangle className="w-3.5 h-3.5 text-agent-finance shrink-0 mt-0.5" />
            <p className="text-xs text-agent-finance">{parseErrors.join(". ")}</p>
          </div>
        )}

        {/* Preview table */}
        <div className="rounded-lg border border-border-primary overflow-hidden mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-bg-secondary border-b border-border-primary">
                <th className="text-left px-3 py-2 text-text-muted font-mono">#</th>
                <th className="text-left px-3 py-2 text-text-muted font-mono">Product</th>
                <th className="text-left px-3 py-2 text-text-muted font-mono">Description</th>
                {products.some((p) => p.sku) && (
                  <th className="text-left px-3 py-2 text-text-muted font-mono">SKU</th>
                )}
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 8).map((p, i) => (
                <tr key={i} className="border-b border-border-subtle">
                  <td className="px-3 py-2 text-text-muted">{i + 1}</td>
                  <td className="px-3 py-2 text-text-primary">{p.name}</td>
                  <td className="px-3 py-2 text-text-secondary truncate max-w-[200px]">
                    {p.description || "-"}
                  </td>
                  {products.some((p) => p.sku) && (
                    <td className="px-3 py-2 text-text-muted font-mono">{p.sku || "-"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {products.length > 8 && (
            <div className="px-3 py-2 text-xs text-text-muted bg-bg-secondary">
              +{products.length - 8} more products
            </div>
          )}
        </div>

        <button
          onClick={handleProcess}
          disabled={processing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing {products.length} products...
            </>
          ) : (
            <>
              Classify, screen & find buyers
              <span className="text-white/60 text-xs">({products.length} products)</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // Success state
  if (processed) {
    return (
      <div className="animation-slide-up flex items-center gap-3 px-4 py-3 rounded-lg bg-agent-outreach-muted">
        <CheckCircle className="w-5 h-5 text-agent-outreach" />
        <div>
          <p className="text-sm text-text-primary font-medium">Catalog processed</p>
          <p className="text-xs text-text-secondary">Results are in your workspace</p>
        </div>
      </div>
    );
  }

  // Upload zone
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
        dragOver
          ? "border-accent bg-accent-muted"
          : "border-border-primary hover:border-border-hover"
      )}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <Upload
        className={cn(
          "w-8 h-8 mx-auto mb-3 transition-colors",
          dragOver ? "text-accent" : "text-text-muted"
        )}
      />
      <p className="text-sm text-text-primary mb-1">
        Drop your product catalog here
      </p>
      <p className="text-xs text-text-tertiary">
        CSV or TSV with product names and descriptions
      </p>

      {parseErrors.length > 0 && (
        <p className="text-xs text-red-400 mt-3">{parseErrors[0]}</p>
      )}
    </div>
  );
}
