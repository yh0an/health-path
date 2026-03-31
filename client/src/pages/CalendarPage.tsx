import { useState, useEffect } from 'react';
import type { CalendarEvent, CreateEventPayload } from '../services/api';
import { calendarApi } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Skeleton } from '../components/Skeleton';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<CalendarEvent['eventType'], string> = {
  MEDICAL: 'Médical',
  SPORT: 'Sport',
  OTHER: 'Autre',
};

const EVENT_TYPE_COLORS: Record<CalendarEvent['eventType'], string> = {
  SPORT: '#34C759',
  MEDICAL: '#007AFF',
  OTHER: '#86868B',
};

const DAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthBounds(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDayHeader(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// ─── EventDot ────────────────────────────────────────────────────────────────

interface EventDotProps {
  eventType: CalendarEvent['eventType'];
}

function EventDot({ eventType }: EventDotProps) {
  return (
    <span
      className="inline-block rounded-full"
      style={{ width: 6, height: 6, backgroundColor: EVENT_TYPE_COLORS[eventType] }}
    />
  );
}

// ─── EventRow ────────────────────────────────────────────────────────────────

interface EventRowProps {
  event: CalendarEvent;
  onCheckToggle: (event: CalendarEvent) => void;
  onClickTitle: (event: CalendarEvent) => void;
}

function EventRow({ event, onCheckToggle, onClickTitle }: EventRowProps) {
  return (
    <div className="flex items-center gap-2 py-2">
      <EventDot eventType={event.eventType} />
      <button
        className="flex-1 text-left text-sm font-medium text-label truncate"
        onClick={() => onClickTitle(event)}
      >
        {event.title}
      </button>
      <span
        className="text-xs font-medium px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: EVENT_TYPE_COLORS[event.eventType] + '20',
          color: EVENT_TYPE_COLORS[event.eventType],
        }}
      >
        {EVENT_TYPE_LABELS[event.eventType]}
      </span>
      <input
        type="checkbox"
        checked={event.completed}
        onChange={() => onCheckToggle(event)}
        className="w-4 h-4 accent-accent shrink-0"
        aria-label={event.completed ? 'Marquer incomplet' : 'Marquer complété'}
      />
    </div>
  );
}

// ─── MonthCalendar ────────────────────────────────────────────────────────────

interface MonthCalendarProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

function MonthCalendar({ year, month, events, selectedDate, onSelectDate, onPrev, onNext }: MonthCalendarProps) {
  const today = new Date().toISOString().split('T')[0];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Day of week of first day (0=Sun → convert to Mon-based 0=Mon)
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7; // Mon-based offset

  // Build map: dateStr → list of event types
  const eventsByDate: Record<string, CalendarEvent['eventType'][]> = {};
  for (const ev of events) {
    const d = ev.date.split('T')[0];
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(ev.eventType);
  }

  // Grid cells: nulls for padding, then day numbers
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onPrev}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface text-label"
          aria-label="Mois précédent"
        >
          ‹
        </button>
        <span className="font-semibold text-label capitalize">{formatMonthYear(year, month)}</span>
        <button
          onClick={onNext}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface text-label"
          aria-label="Mois suivant"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-secondary py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={idx} />;
          }
          const dateStr = toDateStr(year, month, day);
          const isSelected = selectedDate === dateStr;
          const isToday = today === dateStr;
          const dots = eventsByDate[dateStr] ?? [];

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(dateStr)}
              className="flex flex-col items-center py-0.5 gap-0.5 focus:outline-none"
              aria-label={dateStr}
            >
              <span
                className={[
                  'w-7 h-7 flex items-center justify-center text-sm rounded-full transition-colors',
                  isSelected ? 'bg-accent text-white font-semibold' : '',
                  !isSelected && isToday ? 'font-bold ring-2 ring-accent text-accent' : '',
                  !isSelected && !isToday ? 'text-label hover:bg-surface' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {day}
              </span>
              {dots.length > 0 && (
                <span className="flex gap-0.5">
                  {/* Show up to 3 dots, deduplicated by type */}
                  {[...new Set(dots)].slice(0, 3).map((type, di) => (
                    <EventDot key={di} eventType={type} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ─── SelectedDayEvents ────────────────────────────────────────────────────────

interface SelectedDayEventsProps {
  selectedDate: string | null;
  events: CalendarEvent[];
  onCheckToggle: (event: CalendarEvent) => void;
  onClickTitle: (event: CalendarEvent) => void;
  onAddEvent: () => void;
}

function SelectedDayEvents({ selectedDate, events, onCheckToggle, onClickTitle, onAddEvent }: SelectedDayEventsProps) {
  const dayEvents = selectedDate
    ? events.filter((e) => e.date.split('T')[0] === selectedDate)
    : [];

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-label">
          {selectedDate ? formatDayHeader(selectedDate) : 'Sélectionnez un jour'}
        </h2>
        <Button variant="ghost" size="sm" onClick={onAddEvent} aria-label="Ajouter un événement">
          +
        </Button>
      </div>
      {!selectedDate ? (
        <p className="text-secondary text-sm text-center py-3">Aucun jour sélectionné</p>
      ) : dayEvents.length === 0 ? (
        <p className="text-secondary text-sm text-center py-3">Aucun événement ce jour</p>
      ) : (
        <div className="divide-y divide-surface">
          {dayEvents.map((ev) => (
            <EventRow
              key={ev.id}
              event={ev}
              onCheckToggle={onCheckToggle}
              onClickTitle={onClickTitle}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── ListView ─────────────────────────────────────────────────────────────────

interface ListViewProps {
  events: CalendarEvent[];
  onCheckToggle: (event: CalendarEvent) => void;
  onClickTitle: (event: CalendarEvent) => void;
  onAddEvent: () => void;
}

function ListView({ events, onCheckToggle, onClickTitle, onAddEvent }: ListViewProps) {
  // Group by date
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const d = ev.date.split('T')[0];
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(ev);
  }
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-label">Événements du mois</h2>
        <Button variant="primary" size="sm" onClick={onAddEvent} aria-label="Ajouter un événement">
          +
        </Button>
      </div>
      {sortedDates.length === 0 ? (
        <Card>
          <p className="text-secondary text-sm text-center py-4">Aucun événement ce mois</p>
        </Card>
      ) : (
        sortedDates.map((dateStr) => (
          <Card key={dateStr}>
            <h3 className="text-sm font-semibold text-label mb-1 capitalize">
              {formatDayHeader(dateStr)}
            </h3>
            <div className="divide-y divide-surface">
              {grouped[dateStr].map((ev) => (
                <EventRow
                  key={ev.id}
                  event={ev}
                  onCheckToggle={onCheckToggle}
                  onClickTitle={onClickTitle}
                />
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── SportStats ───────────────────────────────────────────────────────────────

interface SportStatsProps {
  events: CalendarEvent[];
}

function SportStats({ events }: SportStatsProps) {
  const sportEvents = events.filter((e) => e.eventType === 'SPORT');
  const completedSport = sportEvents.filter((e) => e.completed).length;

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: '#34C759' }}
        >
          ⚡
        </span>
        <span className="text-sm text-label">
          <span className="font-semibold">{sportEvents.length} séance{sportEvents.length !== 1 ? 's' : ''}</span>
          {' '}ce mois,{' '}
          <span className="font-semibold">{completedSport} complétée{completedSport !== 1 ? 's' : ''}</span>
        </span>
      </div>
    </Card>
  );
}

// ─── AddEventModal ────────────────────────────────────────────────────────────

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  onAdded: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

function AddEventModal({ isOpen, onClose, defaultDate, onAdded, onToast }: AddEventModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate ?? today);
  const [eventType, setEventType] = useState<string>('OTHER');
  const [sportType, setSportType] = useState('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDate(defaultDate ?? today);
      setEventType('OTHER');
      setSportType('');
      setDescription('');
      setIsRecurring(false);
    }
  }, [isOpen, defaultDate, today]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date) return;
    setSubmitting(true);
    try {
      const payload: CreateEventPayload = {
        title,
        date,
        eventType,
        description: description || undefined,
        sportType: eventType === 'SPORT' && sportType ? sportType : undefined,
        isRecurring,
      };
      await calendarApi.create(payload);
      onAdded();
      onClose();
      onToast('Événement ajouté', 'success');
    } catch {
      onToast('Erreur lors de l\'ajout', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvel événement">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-label" htmlFor="ev-title">
            Titre <span className="text-danger">*</span>
          </label>
          <input
            id="ev-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Rendez-vous médecin"
            className="border border-surface rounded-xl px-3 py-2.5 text-label text-base focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-label" htmlFor="ev-date">
            Date <span className="text-danger">*</span>
          </label>
          <input
            id="ev-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-surface rounded-xl px-3 py-2.5 text-label text-base focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-label" htmlFor="ev-type">
            Type
          </label>
          <select
            id="ev-type"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="border border-surface rounded-xl px-3 py-2.5 text-label text-base focus:outline-none focus:ring-2 focus:ring-accent bg-white"
          >
            <option value="MEDICAL">Médical</option>
            <option value="SPORT">Sport</option>
            <option value="OTHER">Autre</option>
          </select>
        </div>

        {eventType === 'SPORT' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-label" htmlFor="ev-sporttype">
              Type de sport
            </label>
            <input
              id="ev-sporttype"
              type="text"
              value={sportType}
              onChange={(e) => setSportType(e.target.value)}
              placeholder="Ex : Course, Natation…"
              className="border border-surface rounded-xl px-3 py-2.5 text-label text-base focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-label" htmlFor="ev-desc">
            Description (optionnel)
          </label>
          <textarea
            id="ev-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Notes supplémentaires…"
            className="border border-surface rounded-xl px-3 py-2.5 text-label text-base focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <span className="text-sm text-label">Événement récurrent</span>
        </label>

        <Button type="submit" variant="primary" disabled={submitting} className="w-full mt-1">
          {submitting ? 'Ajout…' : 'Ajouter'}
        </Button>
      </form>
    </Modal>
  );
}

// ─── EventDetailModal ─────────────────────────────────────────────────────────

interface EventDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onDeleted: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

function EventDetailModal({ event, onClose, onDeleted, onToast }: EventDetailModalProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!event) return;
    setDeleting(true);
    try {
      await calendarApi.delete(event.id);
      onDeleted();
      onClose();
      onToast('Événement supprimé', 'success');
    } catch {
      onToast('Erreur lors de la suppression', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal isOpen={event !== null} onClose={onClose} title="Détail de l'événement">
      {event && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <EventDot eventType={event.eventType} />
            <span className="font-semibold text-label">{event.title}</span>
            <span
              className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: EVENT_TYPE_COLORS[event.eventType] + '20',
                color: EVENT_TYPE_COLORS[event.eventType],
              }}
            >
              {EVENT_TYPE_LABELS[event.eventType]}
            </span>
          </div>

          <div className="text-sm text-secondary">
            <span className="font-medium text-label">Date : </span>
            {formatDayHeader(event.date.split('T')[0])}
          </div>

          {event.sportType && (
            <div className="text-sm text-secondary">
              <span className="font-medium text-label">Sport : </span>
              {event.sportType}
            </div>
          )}

          {event.description && (
            <div className="text-sm text-secondary">
              <span className="font-medium text-label">Notes : </span>
              {event.description}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <span className="text-label font-medium">Statut :</span>
            <span className={event.completed ? 'text-accent' : 'text-secondary'}>
              {event.completed ? 'Complété' : 'En attente'}
            </span>
          </div>

          {event.isRecurring && (
            <div className="text-xs text-secondary italic">Événement récurrent</div>
          )}

          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full mt-2"
          >
            {deleting ? 'Suppression…' : 'Supprimer'}
          </Button>
        </div>
      )}
    </Modal>
  );
}

// ─── CalendarPage ─────────────────────────────────────────────────────────────

export function CalendarPage() {
  const { toasts, addToast } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState<'month' | 'list'>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(now.toISOString().split('T')[0]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);

  async function fetchEvents() {
    const { from, to } = getMonthBounds(year, month);
    setLoading(true);
    try {
      const data = await calendarApi.getEvents({ from, to });
      setEvents(data ?? []);
    } catch {
      addToast('Impossible de charger les événements', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  function handlePrevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function handleNextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  async function handleCheckToggle(event: CalendarEvent) {
    try {
      await calendarApi.update(event.id, { completed: !event.completed });
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, completed: !event.completed } : e))
      );
    } catch {
      addToast('Erreur lors de la mise à jour', 'error');
    }
  }

  function handleOpenAddModal() {
    setAddModalOpen(true);
  }

  if (loading) {
    return (
      <div className="pt-6 px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-16 rounded-card" />
      </div>
    );
  }

  return (
    <div className="pt-6 px-4 pb-24 flex flex-col gap-4">
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-label">Calendrier</h1>
        {/* View toggle */}
        <div className="flex bg-surface rounded-xl p-0.5 gap-0.5">
          <button
            className={[
              'px-3 py-1.5 text-sm font-medium rounded-[10px] transition-colors',
              view === 'month' ? 'bg-white text-label shadow-sm' : 'text-secondary',
            ].join(' ')}
            onClick={() => setView('month')}
          >
            Mois
          </button>
          <button
            className={[
              'px-3 py-1.5 text-sm font-medium rounded-[10px] transition-colors',
              view === 'list' ? 'bg-white text-label shadow-sm' : 'text-secondary',
            ].join(' ')}
            onClick={() => setView('list')}
          >
            Liste
          </button>
        </div>
      </div>

      {/* Month view */}
      {view === 'month' && (
        <>
          <MonthCalendar
            year={year}
            month={month}
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPrev={handlePrevMonth}
            onNext={handleNextMonth}
          />
          <SelectedDayEvents
            selectedDate={selectedDate}
            events={events}
            onCheckToggle={handleCheckToggle}
            onClickTitle={setDetailEvent}
            onAddEvent={handleOpenAddModal}
          />
        </>
      )}

      {/* List view */}
      {view === 'list' && (
        <>
          {/* Month navigation in list mode */}
          <Card>
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface text-label"
                aria-label="Mois précédent"
              >
                ‹
              </button>
              <span className="font-semibold text-label capitalize">{formatMonthYear(year, month)}</span>
              <button
                onClick={handleNextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface text-label"
                aria-label="Mois suivant"
              >
                ›
              </button>
            </div>
          </Card>
          <ListView
            events={events}
            onCheckToggle={handleCheckToggle}
            onClickTitle={setDetailEvent}
            onAddEvent={handleOpenAddModal}
          />
        </>
      )}

      {/* Sport stats */}
      <SportStats events={events} />

      {/* Add event modal */}
      <AddEventModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        defaultDate={selectedDate ?? undefined}
        onAdded={fetchEvents}
        onToast={addToast}
      />

      {/* Event detail / delete modal */}
      <EventDetailModal
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onDeleted={fetchEvents}
        onToast={addToast}
      />
    </div>
  );
}
