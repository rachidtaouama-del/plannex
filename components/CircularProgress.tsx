import React from 'react';

interface CircularProgressProps {
    percent: number;
    size?: number;
    strokeWidth?: number;
    circleColor?: string;
    textColor?: string;
    label?: string;
    subLabel?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
    percent,
    size = 200,
    strokeWidth = 15,
    circleColor = '#10b981',
    textColor = '#ffffff',
    label = 'GLOBAL',
    subLabel = ''
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    className="-rotate-90"
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                >
                    {/* Background circle */}
                    <circle
                        className="text-white/5"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    {/* Progress circle */}
                    <circle
                        style={{
                            strokeDasharray: circumference,
                            strokeDashoffset: offset,
                            transition: 'stroke-dashoffset 1s ease-in-out',
                        }}
                        stroke={circleColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                </svg>
                {/* Text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-5xl font-black italic tracking-tighter" style={{ color: textColor }}>
                        {percent}%
                    </span>
                    {label && (
                        <span className="text-[10px] font-black tracking-[0.3em] uppercase mt-1 opacity-60" style={{ color: circleColor }}>
                            {label}
                        </span>
                    )}
                </div>
            </div>
            {subLabel && (
                <div className="mt-8 text-center">
                    <div className="text-3xl font-black text-white italic tracking-tighter">
                        {subLabel.split(' ')[0]} <span className="text-slate-500">/ {subLabel.split(' ')[2] || ''}</span>
                    </div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 italic">
                        {subLabel.substring(subLabel.indexOf(' ') + 1).replace('/ ', '')}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CircularProgress;
