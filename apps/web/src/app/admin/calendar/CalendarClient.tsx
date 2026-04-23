'use client';

import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DateSelectArg, EventClickArg, DatesSetArg } from '@fullcalendar/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, Location, Reservation, PersonalBlock } from '@/lib/api';

type Props = { locations: Location[] };

type Panel =
  | { type: 'reservation'; data: Reservation }
  | { type: 'block'; data: PersonalBlock };

export default function CalendarClient({ locations }: Props) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [panel, setPanel] = useState<Panel | null>(null);
  const [blockDialog, setBlockDialog] = useState<DateSelectArg | null>(null);
  const [blockTitle, setBlockTitle] = useState('');
  const [rangeRef, setRangeRef] = useState<{ from: string; to: string } | null>(null);
  const [events, setEvents] = useState<object[]>([]);
  const calendarRef = useRef<FullCalendar>(null);

  const load = useCallback(
    async (from: string, to: string, locId: string) => {
      const [reservations, blocks] = await Promise.all([
        api.reservations.list(locId, from, to).catch(() => [] as Reservation[]),
        api.personalBlocks.list(locId).catch(() => [] as PersonalBlock[]),
      ]);

      const resEvents = reservations.map((r) => ({
        id: `res-${r.id}`,
        title: r.customers?.name ?? r.guestName ?? '(ゲスト)',
        start: r.startsAt,
        end: r.endsAt,
        backgroundColor: statusColor(r.status),
        borderColor: statusColor(r.status),
        extendedProps: { _type: 'reservation', data: r },
      }));

      const blockEvents = blocks.map((b) => ({
        id: `blk-${b.id}`,
        title: b.title,
        start: b.startsAt,
        end: b.endsAt,
        backgroundColor: '#9ca3af',
        borderColor: '#6b7280',
        extendedProps: { _type: 'block', data: b },
      }));

      setEvents([...resEvents, ...blockEvents]);
    },
    [],
  );

  useEffect(() => {
    if (rangeRef) load(rangeRef.from, rangeRef.to, locationId);
  }, [locationId, rangeRef, load]);

  function handleDatesSet(arg: DatesSetArg) {
    const from = arg.startStr.slice(0, 10);
    const to = arg.endStr.slice(0, 10);
    setRangeRef({ from, to });
  }

  function handleEventClick(arg: EventClickArg) {
    const { _type, data } = arg.event.extendedProps as { _type: string; data: Reservation | PersonalBlock };
    if (_type === 'reservation') setPanel({ type: 'reservation', data: data as Reservation });
    else setPanel({ type: 'block', data: data as PersonalBlock });
  }

  function handleSelect(arg: DateSelectArg) {
    setBlockDialog(arg);
    setBlockTitle('');
  }

  async function createBlock() {
    if (!blockDialog || !blockTitle.trim()) return;
    await api.personalBlocks.create({
      locationId,
      title: blockTitle.trim(),
      startsAt: blockDialog.startStr,
      endsAt: blockDialog.endStr,
    });
    setBlockDialog(null);
    if (rangeRef) load(rangeRef.from, rangeRef.to, locationId);
  }

  async function removeBlock(id: string) {
    await api.personalBlocks.remove(id);
    setPanel(null);
    if (rangeRef) load(rangeRef.from, rangeRef.to, locationId);
  }

  async function cancelReservation(id: string) {
    await api.reservations.cancel(id);
    setPanel(null);
    if (rangeRef) load(rangeRef.from, rangeRef.to, locationId);
  }

  return (
    <div className="flex h-full flex-col">
      {/* location tabs */}
      <div className="flex border-b border-gray-200 bg-white px-4">
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => setLocationId(loc.id)}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              locationId === loc.id
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {/* calendar area */}
        <div className={`flex-1 overflow-auto p-4 transition-all ${panel ? 'mr-80' : ''}`}>
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale="ja"
            firstDay={1}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay',
            }}
            slotMinTime="08:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            allDaySlot={false}
            selectable
            selectMirror
            nowIndicator
            height="auto"
            events={events}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            select={handleSelect}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          />
        </div>

        {/* side panel */}
        {panel && (
          <aside className="absolute right-0 top-0 h-full w-80 overflow-y-auto border-l border-gray-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-800">
                {panel.type === 'reservation' ? '予約詳細' : 'ブロック詳細'}
              </h2>
              <button onClick={() => setPanel(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            {panel.type === 'reservation' && (
              <ReservationDetail
                r={panel.data}
                onCancel={() => cancelReservation(panel.data.id)}
              />
            )}
            {panel.type === 'block' && (
              <BlockDetail b={panel.data} onRemove={() => removeBlock(panel.data.id)} />
            )}
          </aside>
        )}
      </div>

      {/* block creation dialog */}
      {blockDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-80 rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-3 font-semibold text-gray-800">個人ブロック追加</h3>
            <p className="mb-3 text-xs text-gray-500">
              {fmtRange(blockDialog.startStr, blockDialog.endStr)}
            </p>
            <input
              autoFocus
              value={blockTitle}
              onChange={(e) => setBlockTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createBlock()}
              placeholder="タイトル (例: 休憩、移動)"
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBlockDialog(null)}
                className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                キャンセル
              </button>
              <button
                onClick={createBlock}
                className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReservationDetail({ r, onCancel }: { r: Reservation; onCancel: () => void }) {
  const name = r.customers?.name ?? r.guestName ?? '(ゲスト)';
  const phone = r.customers?.phone ?? r.guestPhone;
  return (
    <div className="p-4 text-sm space-y-3">
      <Row label="顧客" value={name} />
      {phone && <Row label="電話" value={phone} />}
      <Row label="メニュー" value={r.services?.name ?? '-'} />
      <Row label="開始" value={fmtDateTime(r.startsAt)} />
      <Row label="終了" value={fmtDateTime(r.endsAt)} />
      <Row label="ステータス" value={statusLabel(r.status)} />
      {r.note && <Row label="メモ" value={r.note} />}
      {r.status !== 'cancelled' && (
        <button
          onClick={onCancel}
          className="mt-4 w-full rounded bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
        >
          予約をキャンセル
        </button>
      )}
    </div>
  );
}

function BlockDetail({ b, onRemove }: { b: PersonalBlock; onRemove: () => void }) {
  return (
    <div className="p-4 text-sm space-y-3">
      <Row label="タイトル" value={b.title} />
      <Row label="開始" value={fmtDateTime(b.startsAt)} />
      <Row label="終了" value={fmtDateTime(b.endsAt)} />
      <button
        onClick={onRemove}
        className="mt-4 w-full rounded bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
      >
        削除
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-gray-400">{label}</span>
      <p className="mt-0.5 text-gray-800">{value}</p>
    </div>
  );
}

function statusColor(status: Reservation['status']) {
  const map: Record<Reservation['status'], string> = {
    pending: '#f59e0b',
    confirmed: '#6366f1',
    completed: '#10b981',
    cancelled: '#d1d5db',
    no_show: '#ef4444',
  };
  return map[status] ?? '#6366f1';
}

function statusLabel(status: Reservation['status']) {
  const map: Record<Reservation['status'], string> = {
    pending: '仮予約',
    confirmed: '確定',
    completed: '完了',
    cancelled: 'キャンセル',
    no_show: '無断欠席',
  };
  return map[status] ?? status;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const date = s.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  const t1 = s.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const t2 = e.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${t1}〜${t2}`;
}
