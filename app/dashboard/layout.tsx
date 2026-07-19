import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white p-4 flex justify-between items-center">
        <Link href="/dashboard" className="font-bold text-xl">FocusAI</Link>
        <UserButton afterSignOutUrl="/" />
      </header>
      <div className="flex flex-1">
        <nav className="w-64 border-r bg-gray-50 p-4">
          <ul className="space-y-2">
            <li><Link href="/dashboard" className="block px-4 py-2 rounded hover:bg-gray-200">Dashboard</Link></li>
            <li><Link href="/dashboard/goals" className="block px-4 py-2 rounded hover:bg-gray-200">Goals</Link></li>
            <li><Link href="/dashboard/reviews" className="block px-4 py-2 rounded hover:bg-gray-200">Reviews</Link></li>
            <li><Link href="/dashboard/history" className="block px-4 py-2 rounded hover:bg-gray-200">History</Link></li>
            <li><Link href="/dashboard/settings" className="block px-4 py-2 rounded hover:bg-gray-200">Settings</Link></li>
          </ul>
        </nav>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}