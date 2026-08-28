import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({
  href = '/',
  className,
  showText = true
}: {
  href?: string;
  className?: string;
  showText?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 font-bold text-foreground',
        className
      )}
    >
      <img
        src="/logo.svg"
        alt="Akea Farms"
        className="size-9"
      />
      {showText && <span className="text-xl tracking-tight">Akea Farms</span>}
    </Link>
  );
}
