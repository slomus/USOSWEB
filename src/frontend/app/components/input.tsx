"use client";
import React from "react";

interface InputProps {
  name?: string;
  className?: string;
  type?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  defaultValue?: string | number;
}

const Input: React.FC<InputProps> = ({
  name,
  className = "",
  type = "text",
  placeholder = "",
  style = {},
  required = false,
  disabled = false,
  autoFocus = false,
  defaultValue,
}) => {
  return (
    <input
      name={name}
      className={`px-4 py-2 border rounded ${className}`}
      type={type}
      placeholder={placeholder}
      style={style}
      required={required}
      disabled={disabled}
      autoFocus={autoFocus}
      defaultValue={defaultValue}
    />
  );
};

export default Input;
