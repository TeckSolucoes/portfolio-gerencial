import type { CSSProperties, ReactNode } from 'react';

// Primitivos de loading state reutilizados pelos loading.tsx das rotas do
// dashboard. `Skeleton` é o bloco base (shimmer); as variantes só ajustam
// classe/estilo por cima dele. Ver .skeleton/.skeleton-text/.skeleton-pill/
// .skeleton-card em globals.css (respeitam prefers-reduced-motion lá).
export function Skeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={`skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}

export function SkeletonText({
  width = '100%',
  height = 13,
  className = '',
}: {
  width?: string | number;
  height?: number;
  className?: string;
}) {
  return <Skeleton className={`skeleton-text ${className}`.trim()} style={{ width, height }} />;
}

export function SkeletonPill({
  width = 70,
  height = 22,
  className = '',
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return <Skeleton className={`skeleton-pill ${className}`.trim()} style={{ width, height }} />;
}

export function SkeletonCard({
  className = '',
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={`skeleton-card ${className}`.trim()} style={style} aria-hidden="true">
      {children}
    </div>
  );
}
