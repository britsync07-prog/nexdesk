"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShopDashboard } from "@/components/shop-dashboard";
export default function DashboardPage() { const router = useRouter(); useEffect(() => { fetch("/api/auth/session").then((res) => res.json()).then((data) => { if (!data.user) router.replace("/login"); }).catch(() => router.replace("/login")); }, [router]); return <main className="mx-auto max-w-6xl p-5 md:p-8"><ShopDashboard /></main>; }
