import { requireUser } from '@/lib/server-helpers';
import { UserProfile } from '@clerk/nextjs';

export default async function SettingsPage() {
  await requireUser();
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <UserProfile />
    </div>
  );
}