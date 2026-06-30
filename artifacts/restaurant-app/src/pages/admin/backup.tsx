import { useRef, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Download, HardDrive, AlertCircle, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-config";

interface RestoreResult {
  users: number;
  menu_items: number;
  orders: number;
  order_items: number;
  table_reservations: number;
}

export default function AdminBackupPage() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedBackup, setParsedBackup] = useState<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExportLoading(true);
    setExportError(null);
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
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setRestoreResult(null);
    setRestoreError(null);
    setParsedBackup(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data?.exported_at) throw new Error("Not a valid TableServe backup file");
        setParsedBackup(data);
      } catch {
        setRestoreError("Invalid file — please select a TableServe JSON backup.");
        setSelectedFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  async function handleRestore() {
    if (!parsedBackup) return;
    const confirmed = window.confirm(
      "⚠️  This will overwrite existing records with data from the backup file.\n\nAll-or-nothing: if any part fails, nothing will be saved.\n\nAre you sure you want to proceed?",
    );
    if (!confirmed) return;

    setRestoreLoading(true);
    setRestoreError(null);
    setRestoreResult(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${getApiBaseUrl()}/api/admin/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedBackup),
      });
      const body = await res.json();
      if (!res.ok) throw new Error((body as { error?: string }).error ?? "Restore failed");
      setRestoreResult((body as { restored: RestoreResult }).restored);
      setParsedBackup(null);
      setSelectedFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoreLoading(false);
    }
  }

  return (
    <DashboardLayout role="admin" roleLabel="Admin" roleColor="text-primary">
      <div className="p-8 max-w-2xl space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" data-testid="text-page-title">
            <HardDrive className="h-6 w-6" />
            Backup & Restore
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Export all restaurant data as JSON, or restore from a previous backup.
          </p>
        </div>

        {/* Export */}
        <div className="bg-card border border-card-border rounded-xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </h2>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              The export includes user account credentials. Store the file securely — do not share it publicly.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Included</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>All user accounts (including credentials for full restore)</li>
              <li>Full menu item catalog</li>
              <li>All orders and order line items</li>
              <li>All table reservations</li>
            </ul>
          </div>
          {exportError && <p className="text-sm text-destructive">{exportError}</p>}
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exportLoading ? "Exporting…" : "Export Data as JSON"}
          </button>
        </div>

        {/* Restore */}
        <div className="bg-card border border-card-border rounded-xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Restore from Backup
          </h2>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-400">
              Restore is <strong>all-or-nothing</strong>. Existing records matching backup IDs will be overwritten.
              Records not in the backup are left untouched.
            </p>
          </div>

          {restoreResult ? (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
              <div className="text-sm text-green-400 space-y-0.5">
                <p className="font-semibold">Restore successful!</p>
                <p>{restoreResult.users} users · {restoreResult.menu_items} menu items · {restoreResult.orders} orders · {restoreResult.order_items} order items · {restoreResult.table_reservations} reservations</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">Select backup file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/70 cursor-pointer"
            />
            {selectedFileName && !restoreError && (
              <p className="text-xs text-muted-foreground">Ready to restore: <span className="font-medium text-foreground">{selectedFileName}</span></p>
            )}
            {restoreError && <p className="text-sm text-destructive">{restoreError}</p>}
          </div>

          <button
            onClick={handleRestore}
            disabled={!parsedBackup || restoreLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {restoreLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {restoreLoading ? "Restoring…" : "Restore Data"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
