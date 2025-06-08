"use client";
import Image from "next/image";

export default function TopBar({
  isNavVisible,
  setIsNavVisible,
}: {
  isNavVisible: boolean;
  setIsNavVisible: (value: boolean) => void;
}) {
  return (
    <header className="fixed top-0 left-0 w-screen bg-[#202120] text-white px-6 py-3 flex items-center justify-between shadow-md z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Image src="/logouniwersytet.png" alt="Logo" width={50} height={50} />
          <span className="font-bold tracking-wide text-sm">UNIVERSITY</span>
        </div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="#9C9793"
          className="w-5 h-5 cursor-pointer"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
          />
        </svg>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-[#DFD4CA]">Witaj Studencie!</span>
        <button
          onClick={() => setIsNavVisible(!isNavVisible)}
          className="bg-[#3A6A68] hover:bg-[#2f5553] text-white text-xs px-3 py-1 rounded"
        >
          {isNavVisible ? "Ukryj nawigację" : "Pokaż nawigację"}
        </button>
        <button className="bg-[#8B2E2F] hover:bg-red-800 text-white text-xs px-3 py-1 rounded">
          Logout
        </button>
        <Image
          src="/userPicture.jpg"
          alt="Avatar"
          width={50}
          height={50}
          className="rounded-full border border-[#9C9793]"
        />
      </div>
    </header>
  );
}
