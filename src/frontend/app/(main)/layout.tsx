"use client";
import { useState } from "react";
import TopBar from "@/app/components/TopBar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <TopBar />

      {children}
    </div>
  );
}
