import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Download, HardDrive, AlertCircle } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-config";

export default function AdminBackupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${getApiBaseUrl()}/api/admin/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tableserve-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout role="admin" roleLabel="Admin" roleColor="text-primary">
      <div className="p-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HardDrive className="h-6 w-6" />
            Backup & Export
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Download a full JSON export of all restaurant data for backup purposes.
          </p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 space-y-5">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-400">
              This is a <strong>manual backup export</strong>. The file is for archival and disaster-recovery reference only — automatic restore into the database is not available through this interface.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">What's included</h2>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>All user accounts (passwords excluded)</li>
              <li>Full menu item catalog</li>
              <li>All orders and order line items</li>
              <li>All table reservations</li>
            </ul>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {loading ? "Exporting…" : "Export Data as JSON"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
