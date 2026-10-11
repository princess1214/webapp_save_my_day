"use client";

import { useEffect, useRef, useState } from "react";
import { apiGetCloudData, apiImportLocalData, type CloudData } from "@/lib/api-client";
import { ALL_MEMBER_ID, SELF_MEMBER_ID, useAssistMyDayStore } from "@/lib/assistmyday-store";

function localPayload(): Partial<CloudData> {
  const state = useAssistMyDayStore.getState();
  const profile: Partial<typeof state.profile> = { ...state.profile, passcode: undefined };
  return {
    profile,
    familyMembers: state.familyMembers.filter((member) => member.id !== ALL_MEMBER_ID && member.id !== SELF_MEMBER_ID),
    events: state.events.filter((event) => !event.id.startsWith("us-fed-")),
    journalPosts: state.journalPosts,
    healthRecords: state.healthRecords,
    appPreferences: state.appPreferences,
  };
}

function hasLocalRecords(data: Partial<CloudData>) {
  const profile = data.profile || {};
  return Boolean(
    data.familyMembers?.length ||
    data.events?.length ||
    data.journalPosts?.length ||
    data.healthRecords?.length ||
    profile.displayName ||
    profile.firstName ||
    profile.birthday
  );
}

export function CloudDataSync() {
  const hydrateCloudData = useAssistMyDayStore((state) => state.hydrateCloudData);
  const localRef = useRef<Partial<CloudData> | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      await new Promise<void>((resolve) => {
        if (useAssistMyDayStore.persist.hasHydrated()) return resolve();
        const stop = useAssistMyDayStore.persist.onFinishHydration(() => { stop(); resolve(); });
      });
      const local = localPayload();
      localRef.current = local;
      try {
        const cloud = await apiGetCloudData();
        if (cancelled) return;
        if (hasLocalRecords(local)) {
          const backupKey = `assistmyday-local-backup-${cloud.profile.accountId || "account"}`;
          if (!localStorage.getItem(backupKey)) localStorage.setItem(backupKey, JSON.stringify(local));
          if (!localStorage.getItem("assistmyday-import-dismissed")) setShowImport(true);
        }
        hydrateCloudData(cloud);
      } catch {
        // Logged-out routes and transient network failures continue to use the local cache.
      }
    };
    void sync();
    const onError = (event: Event) => setMessage((event as CustomEvent<string>).detail || "Cloud sync failed.");
    window.addEventListener("assistmyday-sync-error", onError);
    return () => { cancelled = true; window.removeEventListener("assistmyday-sync-error", onError); };
  }, [hydrateCloudData]);

  async function importLocal() {
    if (!localRef.current) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await apiImportLocalData(localRef.current);
      hydrateCloudData(await apiGetCloudData());
      setMessage(result.message);
      setShowImport(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Local import failed.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    setShowImport(false);
    localStorage.setItem("assistmyday-import-dismissed", "1");
  }

  if (!showImport && !message) return null;
  return (
    <div className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[100] mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-3 text-sm shadow-xl dark:border-emerald-900 dark:bg-slate-900">
      {showImport ? (
        <>
          <p className="font-semibold text-slate-900 dark:text-white">Local data found</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">A recoverable local backup was saved. Import adds only missing records and does not overwrite cloud data.</p>
          <div className="mt-3 flex gap-2">
            <button disabled={busy} onClick={importLocal} className="rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Importing…" : "Import local data"}</button>
            <button onClick={dismiss} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">Not now</button>
          </div>
        </>
      ) : null}
      {message ? <p className="mt-2 text-slate-700 dark:text-slate-200">{message}</p> : null}
    </div>
  );
}
