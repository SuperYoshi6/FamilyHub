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
        <linearGradient id="logo_grad_premium" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" /> {/* Indigo */}
          <stop offset="50%" stopColor="#ec4899" /> {/* Pink */}
          <stop offset="100%" stopColor="#06b6d4" /> {/* Cyan */}
        </linearGradient>
        <filter id="logo_blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
        </filter>
      </defs>
      
      {/* Glow Layer */}
      <circle cx="256" cy="256" r="200" fill="url(#logo_grad_premium)" opacity="0.3" filter="url(#logo_blur)" />
      
      {/* Main Glass Shape */}
      <path 
        fill="url(#logo_grad_premium)"
        fillRule="evenodd"
        d="
          M256 60
          L60 220
          V420
          C60 442.1 77.9 460 100 460
          H412
          C434.1 460 452 442.1 452 420
          V220
          L256 60
          Z
          M256 360
          C256 360 330 310 330 260
          C330 230 310 210 285 210
          C270 210 260 220 256 230
          C252 220 242 210 227 210
          C202 210 182 230 182 260
          C182 310 256 360 256 360
          Z
        "
      />
      {/* Shine Highlight */}
      <path 
        d="M256 80 L80 230 Q80 220 256 70 Z" 
        fill="white" 
        opacity="0.2" 
      />
    </svg>
  );
};

export default Logo;