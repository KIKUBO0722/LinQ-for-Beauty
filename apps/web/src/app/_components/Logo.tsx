type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 22, className = '' }: LogoProps) {
  return (
    <span
      className={`font-extrabold tracking-tight ${className}`}
      style={{
        fontFamily: 'var(--font-inter-tight), sans-serif',
        fontSize: size,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          background: 'var(--gradient-primary)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        }}
      >
        Lin
      </span>
      <span className="text-ink-900">Q</span>
    </span>
  );
}
