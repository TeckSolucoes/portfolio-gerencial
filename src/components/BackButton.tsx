import Link from 'next/link';

export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="btn-ghost" style={{ marginBottom: 22 }}>
      ← Voltar para {label}
    </Link>
  );
}
