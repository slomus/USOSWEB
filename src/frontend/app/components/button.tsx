"use client";
import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  bgColor?: string;
  textColor?: string;
  className?: string;
  style?: React.CSSProperties;
  type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  bgColor = "#3A6A68",
  textColor = "#DFD4CA",
  className = "",
  style = {},
  type = "button",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 rounded ${className}`}
      style={{ backgroundColor: bgColor, color: textColor, ...style }}
    >
      {children}
    </button>
  );
};

export default Button;