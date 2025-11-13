"use client";

import { useTheme } from "next-themes";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

export default function ToastWrapper() {
  const { theme } = useTheme();
  const toastTheme = theme === "dark" ? "dark" : "light";

  return (
    <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={toastTheme}
      aria-label={undefined}
    />
  );
}
