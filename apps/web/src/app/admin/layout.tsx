import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-5">
        <span className="mr-8 text-sm font-bold tracking-tight text-indigo-700">LinQ for Beauty</span>
        <nav className="flex gap-1 text-sm">
          <NavLink href="/admin/calendar">カレンダー</NavLink>
        </nav>
      </header>
      <main className="flex-1 overflow-hidden bg-gray-50">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded px-3 py-1.5 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
    >
      {children}
    </Link>
  );
}
