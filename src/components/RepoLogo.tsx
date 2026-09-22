import React from 'react';

interface RepoLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function RepoLogo({ size = 24, className = '', showText = false }: RepoLogoProps) {
  const strokeWidth = size * 0.06;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M4 6L12 22H14.5L10 12L16 26L18 26L21.5 22H24L20 12L24 6L20 6L16 14L12 6L4 6Z"
          stroke="#B8F36B"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M6 4L4 6L6 8"
          stroke="#B8F36B"
          strokeWidth={strokeWidth * 0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M26 4L28 6L26 8"
          stroke="#B8F36B"
          strokeWidth={strokeWidth * 0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.6"
        />
      </svg>
      {showText && (
        <span
          className="font-semibold tracking-wider"
          style={{ fontSize: size * 0.5, color: '#F5F5F5' }}
        >
          Repo
        </span>
      )}
    </div>
  );
}

export function RepoIconOnly({ size = 24, className = '' }: { size?: number; className?: string }) {
  const strokeWidth = size * 0.06;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4 6L12 22H14.5L10 12L16 26L18 26L21.5 22H24L20 12L24 6L20 6L16 14L12 6L4 6Z"
        stroke="#B8F36B"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M6 4L4 6L6 8"
        stroke="#B8F36B"
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M26 4L28 6L26 8"
        stroke="#B8F36B"
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
