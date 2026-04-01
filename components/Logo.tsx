import React from 'react';
import { Lock } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: number;
  src?: string;
  showLock?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 40, src, showLock = false }) => {
  const imgSrc = src || '/icon.png';
  const lockSize = Math.round(size * 0.35);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <img
        src={imgSrc}
        width={size}
        height={size}
        className="object-contain w-full h-full"
        alt="Logo"
      />
      {showLock && (
        <div
          className="absolute bottom-0 right-0 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md"
          style={{ width: lockSize + 6, height: lockSize + 6 }}
        >
          <Lock size={lockSize} className="text-gray-700 dark:text-gray-200" />
        </div>
      )}
    </div>
  );
};

export default Logo;
