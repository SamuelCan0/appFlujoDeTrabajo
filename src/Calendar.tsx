import { type CSSProperties, type FormEvent, useState } from "react";
import {
  type Action,
  type ColorKey,
  type Delivery,
  COLORS,
  COLOR_KEYS,
} from "./store";

type Dispatch = (action: Action) => void;
type ShowUndo = (undo: { message: string; action: Action }) => void;

const DEFAULT_COLOR: ColorKey = "azul";
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const todayKey = () => toKey(new Date());
const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);

const longDate = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const monthName = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
});

const markStyle = (color: ColorKey) =>
  ({ "--mark": COLORS[color] }) as CSSProperties;

function Glyph({ path }: { path: string }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function Swatches({
  value,
  onPick,
}: {
  value: ColorKey;
  onPick: (color: ColorKey) => void;
}) {
  return (
    <div className="swatches" role="group" aria-label="Color">
      {COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className="swatch"
          style={markStyle(key)}
          aria-label={key}
          title={capitalize(key)}
          aria-pressed={value === key}
          onClick={() => onPick(key)}
        />
      ))}
    </div>
  );
}

function DeliveryEditor({
  delivery,
  dispatch,
  onClose,
}: {
  delivery: Delivery;
  dispatch: Dispatch;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(delivery.title);
  const update = (patch: Partial<Delivery>) =>
    dispatch({ type: "updateDelivery", id: delivery.id, patch });

  const commitTitle = () => {
    const clean = title.trim();
    if (clean && clean !== delivery.title) update({ title: clean });
    else setTitle(delivery.title);
  };

  return (
    <div
      className="delivery-editor"
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <input
        className="text-input editor-title"
        value={title}
        aria-label="Nombre de la entrega"
        onChange={(event) => setTitle(event.target.value)}
        onBlur={commitTitle}
        onKeyDown={(event) => event.key === "Enter" && commitTitle()}
      />
      <input
        type="date"
        className="text-input"
        value={delivery.date}
        aria-label="Fecha de entrega"
        onChange={(event) =>
          event.target.value && update({ date: event.target.value })
        }
      />
      <Swatches value={delivery.color} onPick={(color) => update({ color })} />
      <button type="button" className="button editor-done" onClick={onClose}>
        Listo
      </button>
    </div>
  );
}

function DayPanel({
  date,
  deliveries,
  dispatch,
  showUndo,
  onClose,
}: {
  date: string;
  deliveries: Delivery[];
  dispatch: Dispatch;
  showUndo: ShowUndo;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState<ColorKey>(DEFAULT_COLOR);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    dispatch({ type: "addDelivery", delivery: { title: clean, date, color } });
    setTitle("");
  };

  return (
    <div className="day-panel">
      <header className="day-head">
        <h3>{capitalize(longDate.format(fromKey(date)))}</h3>
        <button
          className="icon-button"
          aria-label="Cerrar día"
          onClick={onClose}
        >
          <Glyph path="M6 6l12 12M18 6L6 18" />
        </button>
      </header>

      {deliveries.length > 0 && (
        <ul className="day-list">
          {deliveries.map((delivery) => (
            <li key={delivery.id} className="day-item">
              <div className="day-item-row">
                <span
                  className="due-dot"
                  style={markStyle(delivery.color)}
                  aria-hidden="true"
                />
                <span className="day-item-name" title={delivery.title}>
                  {delivery.title}
                </span>
                <button
                  className="button button-quiet"
                  aria-expanded={editing === delivery.id}
                  onClick={() =>
                    setEditing(editing === delivery.id ? null : delivery.id)
                  }
                >
                  Editar
                </button>
                <button
                  className="button button-quiet"
                  aria-label={`Entregado y borrar: ${delivery.title}`}
                  title="Entregado y borrar"
                  onClick={() => {
                    dispatch({ type: "removeDelivery", id: delivery.id });
                    showUndo({
                      message: `Entrega borrada: ${delivery.title}`,
                      action: { type: "restoreDelivery", delivery },
                    });
                  }}
                >
                  Entregado
                </button>
              </div>
              {editing === delivery.id && (
                <DeliveryEditor
                  delivery={delivery}
                  dispatch={dispatch}
                  onClose={() => setEditing(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="day-add" onSubmit={submit}>
        <input
          className="text-input day-add-title"
          autoFocus
          value={title}
          placeholder="Nueva entrega para este día"
          aria-label="Nueva entrega para este día"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && onClose()}
        />
        <Swatches value={color} onPick={setColor} />
        <button
          type="submit"
          className="button button-primary"
          disabled={!title.trim()}
        >
          Añadir
        </button>
      </form>
    </div>
  );
}

export function Calendar({
  deliveries,
  dispatch,
  showUndo,
}: {
  deliveries: Delivery[];
  dispatch: Dispatch;
  showUndo: ShowUndo;
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);

  const today = todayKey();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const offset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const isCurrentMonth = today.startsWith(`${year}-${pad(monthIndex + 1)}`);

  const byDay = new Map<string, Delivery[]>();
  for (const delivery of deliveries) {
    byDay.set(delivery.date, [...(byDay.get(delivery.date) ?? []), delivery]);
  }

  const shift = (delta: number) =>
    setMonth(new Date(year, monthIndex + delta, 1));

  return (
    <div className="calendar">
      <header className="calendar-head">
        <button
          className="icon-button"
          aria-label="Mes anterior"
          onClick={() => shift(-1)}
        >
          <Glyph path="M15 6l-6 6 6 6" />
        </button>
        <h3 aria-live="polite">{capitalize(monthName.format(month))}</h3>
        <button
          className="icon-button"
          aria-label="Mes siguiente"
          onClick={() => shift(1)}
        >
          <Glyph path="M9 6l6 6-6 6" />
        </button>
        {!isCurrentMonth && (
          <button
            className="button button-quiet calendar-today"
            onClick={() => {
              const now = new Date();
              setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
          >
            Hoy
          </button>
        )}
      </header>

      <div className="calendar-grid">
        {WEEKDAYS.map((day) => (
          <span key={day} className="weekday" aria-hidden="true">
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const key = toKey(new Date(year, monthIndex, i + 1));
          const due = byDay.get(key) ?? [];
          const names = due.map((delivery) => delivery.title).join(", ");
          const classes = [
            "day",
            key === today && "day-today",
            key < today && "day-past",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              className={classes}
              aria-pressed={key === selected}
              aria-label={`${longDate.format(fromKey(key))}${
                names ? `. Entregas: ${names}` : ""
              }`}
              title={names || undefined}
              onClick={() => setSelected(key === selected ? null : key)}
            >
              <span>{i + 1}</span>
              {due.length > 0 && (
                <span className="day-dots" aria-hidden="true">
                  {due.slice(0, 3).map((delivery) => (
                    <span
                      key={delivery.id}
                      className="due-dot"
                      style={markStyle(delivery.color)}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <DayPanel
          key={selected}
          date={selected}
          deliveries={byDay.get(selected) ?? []}
          dispatch={dispatch}
          showUndo={showUndo}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
