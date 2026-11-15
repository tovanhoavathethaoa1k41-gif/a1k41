import React from 'react';
import { Team } from '../types/tournament';
import { Shield } from 'lucide-react';

interface TeamBadgeProps {
  team: Team | undefined;
  placeholderName?: string;
  layout?: 'vertical' | 'horizontal';
  align?: 'left' | 'right' | 'center';
  logoPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  showNationalBadge?: boolean;
  className?: string;
}

export const TeamBadge: React.FC<TeamBadgeProps> = ({
  team,
  placeholderName,
  layout = 'vertical',
  align = 'center',
  logoPosition = 'right',
  size = 'md',
  showNationalBadge = true,
  className = ''
}) => {
  // Enlarged logo sizes for high visibility and sharp detail
  const logoSizes = {
    sm: 'h-8 md:h-9 max-w-[36px]',
    md: 'h-11 md:h-14 max-w-[56px]',
    lg: 'h-16 md:h-20 max-w-[80px]'
  };

  const textSizes = {
    sm: 'text-xs font-bold',
    md: 'text-xs sm:text-sm font-black tracking-tight',
    lg: 'text-sm sm:text-base font-black tracking-tight'
  };

  const flagSize = logoSizes[size];

  // Placeholder when team is not yet determined
  if (!team) {
    if (layout === 'vertical') {
      return (
        <div className={`flex flex-col items-center justify-center text-center gap-1.5 py-1 ${className}`}>
          {/* Logo ở trên (Biểu tượng khiên chờ) */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-900/80 border border-dashed border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
            <Shield className="w-5 h-5 text-cyan-400/80" />
          </div>
          {/* Tên đội ở dưới, căn giữa */}
          <span className="text-xs sm:text-sm font-bold text-slate-300 text-center leading-tight max-w-[130px] sm:max-w-[160px] truncate">
            {placeholderName || 'Chờ xác định'}
          </span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : align === 'center' ? 'justify-center text-center' : 'text-left'} ${className}`}>
        <div className="w-6 h-6 rounded-lg bg-slate-900 border border-dashed border-cyan-500/30 flex items-center justify-center text-cyan-400/60 shrink-0">
          <Shield className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs sm:text-sm font-semibold text-slate-400 italic">
          {placeholderName || 'Chờ xác định'}
        </span>
      </div>
    );
  }

  const logoElement = showNationalBadge ? (
    <div
      className="inline-flex items-center justify-center shrink-0 p-1 rounded-xl bg-black/40 border border-cyan-500/20 shadow-[0_4px_16px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-200"
      title={`Đại diện: ${team.nationalTeam.name}`}
    >
      <img
        src={team.nationalTeam.logo}
        alt={team.nationalTeam.name}
        className={`${flagSize} object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]`}
        loading="lazy"
      />
    </div>
  ) : null;

  const nameElement = (
    <span className={`${textSizes[size]} text-slate-100 group-hover:text-emerald-400 transition-colors drop-shadow-sm text-center leading-tight max-w-[140px] sm:max-w-[190px] truncate`}>
      {team.name}
    </span>
  );

  // YÊU CẦU: Logo ở trên, Tên đội ở dưới, Tên đội và Logo căn giữa
  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2 py-1 ${className}`}>
        {logoElement}
        {nameElement}
      </div>
    );
  }

  // Layout ngang (dành cho bảng xếp hạng table row)
  return (
    <div
      className={`inline-flex items-center gap-2.5 md:gap-3.5 ${
        align === 'right' ? 'justify-end text-right' : align === 'center' ? 'justify-center text-center' : 'justify-start text-left'
      } ${className}`}
    >
      {logoPosition === 'left' ? (
        <>
          {logoElement}
          {nameElement}
        </>
      ) : (
        <>
          {nameElement}
          {logoElement}
        </>
      )}
    </div>
  );
};
