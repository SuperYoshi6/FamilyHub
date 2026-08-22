import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

/**
 * Modern SVG Logo for FamilyHub.
 * Scalable, sharp, and natively transparent.
 */
const Logo: React.FC<LogoProps> = ({ className = "", size = 40, glow = true }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {glow && (
         <div
           className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full animate-pulse-slow"
           style={{ transform: 'scale(1.4)' }}
         ></div>
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          <linearGradient id="logo_grad_vibrant" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#f97316" />   {/* Orange */}
            <stop offset="50%" stopColor="#ec4899" />  {/* Pink */}
            <stop offset="100%" stopColor="#a855f7" /> {/* Purple */}
          </linearGradient>
        </defs>

        {/* Modern Rounded House Shape */}
        <path
          fill="url(#logo_grad_vibrant)"
          d="M256,40c-15.4,0-30.2,6.1-41.1,17L57.5,214.3c-13,13-13,34.1,0,47.1c13,13,34.1,13,47.1,0L128,238.1V416 c0,30.9,25.1,56,56,56h144c30.9,0,56-25.1,56-56V238.1l23.4,23.4c13,13,34.1,13,47.1,0c13-13,13-34.1,0-47.1L308.1,57 C297.2,46.1,282.4,40,256,40z"
        />

        {/* White Heart Center */}
        <path
          fill="white"
          d="M256,360c-2.4,0-4.8-0.9-6.7-2.7c-21.7-21.1-53.3-43.3-53.3-73.3c0-22.1,17.9-40,40-40c8.8,0,16.8,2.8,20,7.3 c3.2-4.5,11.2-7.3,20-7.3c22.1,0,40,17.9,40,40c0,30-31.6,52.2-53.3,73.3C260.8,359.1,258.4,360,256,360z"
        />
      </svg>
    </div>
  );
};

export default Logo;
