"use client";
import { useState } from "react";
import TopBar from "@/app/components/TopBar";
import Footer from "../components/Footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <TopBar />
      {children}
      <Footer />
    </div>
  );
}
