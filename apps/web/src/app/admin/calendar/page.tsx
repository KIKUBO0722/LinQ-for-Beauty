import { api } from '@/lib/api';
import CalendarClient from './CalendarClient';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const locations = await api.locations.list().catch(() => []);
  return <CalendarClient locations={locations} />;
}
