"use client"
import Image from "next/image";

export default function Home() {
  return (
    <div>
      <button className="px-4 py-2 bg-gray-200 rounded border border-gray-300 hover:bg-gray-300 cursor-pointer">Calendar</button>
      <button className="px-4 py-2 bg-gray-200 rounded border border-gray-300 hover:bg-gray-300 cursor-pointer">Common</button>
      <button className="px-4 py-2 bg-gray-200 rounded border border-gray-300 hover:bg-gray-300 cursor-pointer">Messaging</button>
    </div>
  );
}
