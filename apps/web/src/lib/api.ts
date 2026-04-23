const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';
export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export type Location = {
  id: string;
  name: string;
  address: string | null;
};

export type Reservation = {
  id: string;
  locationId: string;
  serviceId: string;
  customerId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  startsAt: string;
  endsAt: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  note: string | null;
  services: { name: string; durationMin: number } | null;
  customers: { name: string; phone: string | null } | null;
};

export type PersonalBlock = {
  id: string;
  tenantId: string;
  locationId: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
};

export const api = {
  locations: {
    list: () => req<Location[]>(`/api/v1/locations?tenantId=${TENANT_ID}`),
  },
  reservations: {
    list: (locationId: string, from: string, to: string) =>
      req<Reservation[]>(
        `/api/v1/reservations?tenantId=${TENANT_ID}&locationId=${locationId}&from=${from}&to=${to}`,
      ),
    cancel: (id: string) => req<Reservation>(`/api/v1/reservations/${id}`, { method: 'DELETE' }),
  },
  personalBlocks: {
    list: (locationId: string) =>
      req<PersonalBlock[]>(`/api/v1/personal-blocks?tenantId=${TENANT_ID}&locationId=${locationId}`),
    create: (body: { locationId: string; title: string; startsAt: string; endsAt: string }) =>
      req<PersonalBlock>(`/api/v1/personal-blocks?tenantId=${TENANT_ID}`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      req<PersonalBlock>(`/api/v1/personal-blocks/${id}?tenantId=${TENANT_ID}`, { method: 'DELETE' }),
  },
};
