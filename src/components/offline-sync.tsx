"use client";
import { useEffect } from "react";
import { flushQueuedTransactions } from "@/lib/offline-queue";
export function OfflineSync() { useEffect(() => { const sync = () => { void flushQueuedTransactions(); }; sync(); window.addEventListener("online", sync); return () => window.removeEventListener("online", sync); }, []); return null; }
