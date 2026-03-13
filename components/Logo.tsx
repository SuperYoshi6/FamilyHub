import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 40 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo_grad_sunset" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f59e0b" /> {/* Amber/Orange */}
          <stop offset="50%" stopColor="#ec4899" /> {/* Pink */}
          <stop offset="100%" stopColor="#8b5cf6" /> {/* Violet */}
        </linearGradient>
      </defs>
      
      {/* 
         Design: "Family Heart Home - Sunset Edition"
         Solid house shape filled with warm gradient, heart cutout.
      */}
      <path 
        fill="url(#logo_grad_sunset)"
        fillRule="evenodd"
        d="
          M256 80
          L80 240
          V432
          C80 449.6 94.4 464 112 464
          H400
          C417.6 464 432 449.6 432 432
          V240
          L256 80
          Z
          M256 380
          C256 380 346 325 346 270
          C346 240 321 220 291 220
          C274 220 263 230 256 240
          C249 230 238 220 221 220
          C191 220 166 240 166 270
          C166 325 256 380 256 380
          Z
        "
      />
    </svg>
  );
};

export default Logo;