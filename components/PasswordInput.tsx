"use client";

import { useState } from "react";

export default function PasswordInput({
  value,
  onChange,
  placeholder,
  showLabel,
  hideLabel,
  required = true,
  minLength = 6,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showLabel: string;
  hideLabel: string;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <input
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input w-full pr-20"
        placeholder={placeholder}
        autoComplete={required ? "new-password" : "current-password"}
      />
      <button
        type="button"
        className="password-input-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
      >
        {visible ? hideLabel : showLabel}
      </button>
    </div>
  );
}
