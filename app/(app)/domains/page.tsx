"use client";

import { useState, useEffect } from "react";
import { Globe, Plus, CheckCircle, XCircle, Clock, Loader2, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type Domain = {
  id: string;
  hostname: string;
  verificationToken: string;
  verificationStatus: string;
  sslStatus: string;
  provider: string;
  createdAt: string;
};

type Instructions = {
  type: string;
  name: string;
  value: string;
  txtRecord: { name: string; value: string };
};

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostname, setHostname] = useState("");
  const [adding, setAdding] = useState(false);
  const [lastInstructions, setLastInstructions] = useState<Instructions | null>(null);

  useEffect(() => {
    fetchDomains();
  }, []);

  async function fetchDomains() {
    const res = await fetch("/api/domains");
    if (res.ok) {
      const data = await res.json();
      setDomains(data.domains || []);
    }
    setLoading(false);
  }

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!hostname.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname: hostname.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Domain added! Configure DNS to verify.");
        setHostname("");
        setLastInstructions(data.instructions);
        fetchDomains();
      } else {
        toast.error(data.error || "Failed to add domain");
      }
    } catch {
      toast.error("Failed to add domain");
    } finally {
      setAdding(false);
    }
  }

  async function deleteDomain(id: string, hostname: string) {
    if (!confirm(`Remove ${hostname}?`)) return;
    const res = await fetch(`/api/domains/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Domain removed");
      fetchDomains();
    }
  }

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "verified" || status === "active")
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === "failed")
      return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-2 mb-0.5">
          <Globe className="w-5 h-5 text-primary" />
          <h1 className="text-base font-semibold">Custom Domains</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Connect your own domain for the public knowledge base
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl space-y-8">
          {/* Add domain */}
          <div>
            <h2 className="text-sm font-semibold mb-3">Add a custom domain</h2>
            <form onSubmit={addDomain} className="flex items-center gap-3">
              <Input
                placeholder="help.yourcompany.com"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                required
                className="flex-1"
                id="domain-hostname"
              />
              <Button type="submit" disabled={adding} id="add-domain">
                {adding && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add domain
              </Button>
            </form>
          </div>

          {/* DNS instructions */}
          {lastInstructions && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl animate-fade-in">
              <h3 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                📋 DNS Configuration Required
              </h3>
              <p className="text-sm text-indigo-700 mb-4">
                Add these DNS records to verify your domain. Changes may take up
                to 48 hours to propagate.
              </p>

              <div className="space-y-3">
                {/* CNAME record */}
                <div className="bg-white rounded-lg p-3 border border-indigo-100">
                  <div className="grid grid-cols-3 gap-2 text-xs mb-1.5">
                    <div className="font-medium text-gray-500">Type</div>
                    <div className="font-medium text-gray-500">Name</div>
                    <div className="font-medium text-gray-500">Value</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm font-mono">
                    <div className="text-indigo-700 font-semibold">{lastInstructions.type}</div>
                    <div className="text-gray-900 truncate">{lastInstructions.name}</div>
                    <div className="text-gray-900 truncate">{lastInstructions.value}</div>
                  </div>
                </div>

                {/* TXT verification record */}
                <div className="bg-white rounded-lg p-3 border border-indigo-100">
                  <div className="grid grid-cols-3 gap-2 text-xs mb-1.5">
                    <div className="font-medium text-gray-500">Type</div>
                    <div className="font-medium text-gray-500">Name</div>
                    <div className="font-medium text-gray-500">Value</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm font-mono">
                    <div className="text-indigo-700 font-semibold">TXT</div>
                    <div className="text-gray-900 truncate text-xs">{lastInstructions.txtRecord.name}</div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-900 text-xs truncate">
                        {lastInstructions.txtRecord.value}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(lastInstructions.txtRecord.value);
                          toast.success("Copied!");
                        }}
                        className="text-indigo-500 hover:text-indigo-700 shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-indigo-600 mt-3">
                SSL certificate will be provisioned automatically via Let's Encrypt
                after domain verification completes.
              </p>
            </div>
          )}

          {/* Domain list */}
          <div>
            <h2 className="text-sm font-semibold mb-3">
              Connected domains ({domains.length})
            </h2>
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : domains.length === 0 ? (
              <div className="border rounded-xl p-8 text-center">
                <Globe className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No custom domains yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Add a domain above to get started
                </p>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                {domains.map((domain, i) => (
                  <div
                    key={domain.id}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3",
                      i > 0 && "border-t"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-mono">
                        {domain.hostname}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Provider: {domain.provider}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <StatusIcon status={domain.verificationStatus} />
                        DNS{" "}
                        <span className={cn(
                          domain.verificationStatus === "verified" ? "text-emerald-600" :
                          domain.verificationStatus === "failed" ? "text-red-600" : "text-amber-600"
                        )}>
                          {domain.verificationStatus}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <StatusIcon status={domain.sslStatus} />
                        SSL{" "}
                        <span className={cn(
                          domain.sslStatus === "active" ? "text-emerald-600" :
                          domain.sslStatus === "failed" ? "text-red-600" : "text-amber-600"
                        )}>
                          {domain.sslStatus}
                        </span>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteDomain(domain.id, domain.hostname)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="p-4 bg-muted rounded-xl text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">
              How custom domains work
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-sm">
              <li>Add your hostname above (e.g., help.yourcompany.com)</li>
              <li>Add the CNAME and TXT records to your DNS provider</li>
              <li>SuperProfile verifies the TXT record automatically</li>
              <li>SSL certificate is provisioned via Let's Encrypt</li>
              <li>
                Your knowledge base is available at your custom domain
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
