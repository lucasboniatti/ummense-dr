import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 44,
  lg: 56,
};

const textSizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function Logo({
  size = 'md',
  animated = false,
  showText = false,
  className = '',
}: LogoProps) {
  const dimension = sizeMap[size];
  const logoSrc = animated ? '/logo-animated.svg' : '/logo.svg';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src={logoSrc}
        alt="Tasks Flow Logo"
        width={dimension}
        height={dimension}
        priority
      />
      {showText && (
        <div className="flex flex-col">
          <p className="app-kicker">Tasks Flow</p>
          <span className={`font-bold tracking-[-0.02em] text-neutral-900 ${textSizeMap[size]}`}>
            Gestão de Tarefas
          </span>
        </div>
      )}
    </div>
  );
}

export default Logo;