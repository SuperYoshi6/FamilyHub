import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  src?: string;
  showLock?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 40, src }) => {
  const imgSrc = src || '/icon.png';

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <img
        src={imgSrc}
        width={size}
        height={size}
        className="object-contain w-full h-full rounded-[22%]"
        alt="Logo"
      />
    </div>
  );
};

export default Logo;
