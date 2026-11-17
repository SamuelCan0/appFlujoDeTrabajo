import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  type Action,
  type BedStatus,
  type Flow,
  type Printer,
  type Task,
  type Delivery,
  BED_STATUSES,
  loadState,
  samePrinter,
  reducer,
  saveState,
} from "./store";
import { Calendar } from "./Calendar";
import "./App.css";

const UNDO_MS = 6000;

const STATUS_LABELS: Record<BedStatus, string> = {
  pendiente: "Pendiente",
  imprimiendo: "Imprimiendo",
  lista: "Lista",
};

type Undo = { message: string; action: Action };
type Dispatch = (action: Action) => void;

function Icon({ children }: { children: ReactNode }) {
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
      {children}
    </svg>
  );
}

const CheckIcon = () => (
  <Icon>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);
const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
const MinusIcon = () => (
  <Icon>
    <path d="M5 12h14" />
  </Icon>
);
const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
const PrinterIcon = () => (
  <Icon>
    <path d="M5 4h14v4H5zM7 8v8M17 8v8M4 16h16v4H4zM10 12h4" />
  </Icon>
);

function InlineText({
  value,
  label,
  className,
  onCommit,
}: {
  value: string;
  label: string;
  className: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== value) onCommit(next);
    else setDraft(value);
  };

  return (
    <input
      className={`inline-text ${className}`}
      value={draft}
      aria-label={label}
      title={draft}
      spellCheck={false}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          const input = event.currentTarget;
          setDraft(value);
          // Blur after the reset renders, or the discarded draft would be committed.
          requestAnimationFrame(() => input.blur());
        }
      }}
    />
  );
}

function TaskRow({
  task,
  onDone,
  dispatch,
}: {
  task: Task;
  onDone: () => void;
  dispatch: Dispatch;
}) {
  return (
    <li className="task">
      <button
        className="task-check"
        aria-label={`Terminar: ${task.title}`}
        title="Terminar y borrar"
        onClick={onDone}
      >
        <CheckIcon />
      </button>
      <InlineText
        className="task-title"
        value={task.title}
        label="Nombre de la tarea"
        onCommit={(title) =>
          dispatch({ type: "renameTask", id: task.id, title })
        }
      />
    </li>
  );
}

function TasksPanel({
  tasks,
  deliveries,
  dispatch,
  showUndo,
}: {
  tasks: Task[];
  deliveries: Delivery[];
  dispatch: Dispatch;
  showUndo: (undo: Undo) => void;
}) {
  const [title, setTitle] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    dispatch({ type: "addTask", title: clean });
    setTitle("");
  };

  return (
    <section className="panel panel-tasks" aria-labelledby="tasks-heading">
      <header className="panel-head">
        <h2 id="tasks-heading">Por hacer</h2>
        <span className="count">{tasks.length}</span>
      </header>

      <Calendar
        deliveries={deliveries}
        dispatch={dispatch}
        showUndo={showUndo}
      />

      <form className="add-task" onSubmit={submit}>
        <PlusIcon />
        <input
          value={title}
          placeholder="Añadir tarea y pulsar Enter"
          aria-label="Nueva tarea"
          onChange={(event) => setTitle(event.target.value)}
        />
      </form>

      {tasks.length === 0 ? (
        <p className="empty">No hay tareas pendientes.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              dispatch={dispatch}
              onDone={() => {
                dispatch({ type: "removeTask", id: task.id });
                showUndo({
                  message: `Tarea borrada: ${task.title}`,
                  action: { type: "restoreTask", task, index },
                });
              }}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button
          type="button"
          className="icon-button"
          aria-label={`Quitar cama de ${label}`}
          disabled={value === 0}
          onClick={() => onChange(value - 1)}
        >
          <MinusIcon />
        </button>
        <output aria-label={`Camas de ${label}`}>{value}</output>
        <button
          type="button"
          className="icon-button"
          aria-label={`Añadir cama de ${label}`}
          disabled={value >= 20}
          onClick={() => onChange(value + 1)}
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}

function PrintersPanel({
  printers,
  inUse,
  dispatch,
  onClose,
}: {
  printers: Printer[];
  inUse: Set<Printer>;
  dispatch: Dispatch;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const clean = name.trim();
  const duplicate = printers.some((printer) => samePrinter(printer, clean));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!clean || duplicate) return;
    dispatch({ type: "addPrinter", name: clean });
    setName("");
  };

  return (
    <div
      className="printers-panel"
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <header className="printers-head">
        <h3>Impresoras</h3>
        <button
          className="icon-button"
          aria-label="Cerrar impresoras"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </header>

      <ul className="printer-list">
        {printers.map((printer) => {
          const used = inUse.has(printer);
          const last = printers.length === 1;
          return (
            <li key={printer} className="printer-item">
              <span>{printer}</span>
              <button
                className="icon-button"
                aria-label={`Quitar ${printer}`}
                title={
                  used
                    ? "Está asignada a alguna cama"
                    : last
                      ? "Debe quedar al menos una impresora"
                      : "Quitar impresora"
                }
                disabled={used || last}
                onClick={() => dispatch({ type: "removePrinter", name: printer })}
              >
                <CloseIcon />
              </button>
            </li>
          );
        })}
      </ul>

      <form className="printer-add" onSubmit={submit}>
        <input
          className="text-input"
          autoFocus
          value={name}
          placeholder="Nombre de la nueva máquina"
          aria-label="Nombre de la nueva máquina"
          aria-invalid={duplicate}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          type="submit"
          className="button button-primary"
          disabled={!clean || duplicate}
        >
          <PlusIcon /> Agregar
        </button>
      </form>
      {duplicate && <p className="field-error">Ya existe esa impresora.</p>}
    </div>
  );
}

function NewFlowForm({
  printers,
  dispatch,
  onClose,
}: {
  printers: Printer[];
  dispatch: Dispatch;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [counts, setCounts] = useState<Record<Printer, number>>(() =>
    Object.fromEntries(printers.map((printer, i) => [printer, i === 0 ? 1 : 0])),
  );
  const count = (printer: Printer) => counts[printer] ?? 0;
  const total = printers.reduce((sum, printer) => sum + count(printer), 0);
  const canSubmit = name.trim() !== "" && total > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    dispatch({
      type: "addFlow",
      name: name.trim(),
      printers: printers.flatMap((printer) =>
        Array<Printer>(count(printer)).fill(printer),
      ),
    });
    onClose();
  };

  return (
    <form
      className="new-flow"
      onSubmit={submit}
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <input
        className="new-flow-name"
        autoFocus
        value={name}
        placeholder="Nombre del trabajo"
        aria-label="Nombre del trabajo"
        onChange={(event) => setName(event.target.value)}
      />
      <div className="steppers">
        {printers.map((printer) => (
          <Stepper
            key={printer}
            label={printer}
            value={count(printer)}
            onChange={(value) => setCounts({ ...counts, [printer]: value })}
          />
        ))}
      </div>
      <div className="new-flow-actions">
        <button type="button" className="button" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="submit"
          className="button button-primary"
          disabled={!canSubmit}
        >
          Crear flujo
        </button>
      </div>
    </form>
  );
}

function FlowCard({
  flow,
  printers,
  dispatch,
  onRemove,
}: {
  flow: Flow;
  printers: Printer[];
  dispatch: Dispatch;
  onRemove: () => void;
}) {
  const ready = flow.beds.filter((bed) => bed.status === "lista").length;
  const allReady = ready === flow.beds.length;

  return (
    <article className={`flow ${allReady ? "flow-ready" : ""}`}>
      <header className="flow-head">
        <InlineText
          className="flow-name"
          value={flow.name}
          label="Nombre del trabajo"
          onCommit={(name) =>
            dispatch({ type: "renameFlow", id: flow.id, name })
          }
        />
        <span className="flow-progress-text">
          {ready}/{flow.beds.length} listas
        </span>
        <button
          className="icon-button"
          aria-label={`Cancelar y borrar el flujo ${flow.name}`}
          title="Cancelar y borrar flujo"
          onClick={onRemove}
        >
          <CloseIcon />
        </button>
      </header>

      <div className="progress" aria-hidden="true">
        <div
          className="progress-fill"
          style={{ width: `${(ready / flow.beds.length) * 100}%` }}
        />
      </div>

      <ul className="beds">
        {flow.beds.map((bed, index) => {
          const options = printers.includes(bed.printer)
            ? printers
            : [bed.printer, ...printers];
          return (
            <li key={bed.id} className={`bed bed-${bed.status}`}>
              <span className="bed-name">Cama {index + 1}</span>
              <select
                className="printer-chip"
                value={bed.printer}
                aria-label={`Impresora de la cama ${index + 1}`}
                onChange={(event) =>
                  dispatch({
                    type: "setBedPrinter",
                    flowId: flow.id,
                    bedId: bed.id,
                    printer: event.target.value,
                  })
                }
              >
                {options.map((printer) => (
                  <option key={printer} value={printer}>
                    {printer}
                  </option>
                ))}
              </select>
              <div
                className="segments"
                role="group"
                aria-label={`Estado de la cama ${index + 1}`}
              >
                {BED_STATUSES.map((status) => (
                  <button
                    key={status}
                    className={`segment segment-${status}`}
                    aria-pressed={bed.status === status}
                    onClick={() =>
                      dispatch({
                        type: "setBedStatus",
                        flowId: flow.id,
                        bedId: bed.id,
                        status,
                      })
                    }
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
              <button
                className="icon-button bed-remove"
                aria-label={`Quitar cama ${index + 1}`}
                title="Quitar cama"
                disabled={flow.beds.length === 1}
                onClick={() =>
                  dispatch({
                    type: "removeBed",
                    flowId: flow.id,
                    bedId: bed.id,
                  })
                }
              >
                <MinusIcon />
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="flow-foot">
        <div className="add-bed">
          {printers.map((printer) => (
            <button
              key={printer}
              className="button button-quiet"
              onClick={() =>
                dispatch({ type: "addBed", flowId: flow.id, printer })
              }
            >
              <PlusIcon /> {printer}
            </button>
          ))}
        </div>
        {allReady && (
          <button className="button button-primary" onClick={onRemove}>
            <CheckIcon /> Finalizar y borrar
          </button>
        )}
      </footer>
    </article>
  );
}

function FlowsPanel({
  flows,
  printers,
  dispatch,
  showUndo,
}: {
  flows: Flow[];
  printers: Printer[];
  dispatch: Dispatch;
  showUndo: (undo: Undo) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);
  const inUse = new Set(
    flows.flatMap((flow) => flow.beds.map((bed) => bed.printer)),
  );

  return (
    <section className="panel" aria-labelledby="flows-heading">
      <header className="panel-head">
        <h2 id="flows-heading">Flujo de trabajo</h2>
        <span className="count">{flows.length}</span>
        <button
          className="button panel-action"
          aria-expanded={managing}
          onClick={() => setManaging(!managing)}
        >
          <PrinterIcon /> Impresoras
        </button>
        {!creating && (
          <button
            className="button button-primary"
            onClick={() => setCreating(true)}
          >
            <PlusIcon /> Nuevo flujo
          </button>
        )}
      </header>

      {managing && (
        <PrintersPanel
          printers={printers}
          inUse={inUse}
          dispatch={dispatch}
          onClose={() => setManaging(false)}
        />
      )}

      {creating && (
        <NewFlowForm
          printers={printers}
          dispatch={dispatch}
          onClose={() => setCreating(false)}
        />
      )}

      {flows.length === 0 && !creating ? (
        <p className="empty">No hay trabajos en curso.</p>
      ) : (
        <div className="flow-list">
          {flows.map((flow, index) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              printers={printers}
              dispatch={dispatch}
              onRemove={() => {
                dispatch({ type: "removeFlow", id: flow.id });
                showUndo({
                  message: `Flujo borrado: ${flow.name}`,
                  action: { type: "restoreFlow", flow, index },
                });
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [undo, setUndo] = useState<Undo | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    if (!undo) return;
    timer.current = window.setTimeout(() => setUndo(null), UNDO_MS);
    return () => window.clearTimeout(timer.current);
  }, [undo]);

  const printing = state.flows
    .flatMap((flow) => flow.beds)
    .filter((bed) => bed.status === "imprimiendo").length;

  return (
    <div className="app">
      <header className="topbar">
        <h1>AppTareas</h1>
        <p className={`printing ${printing > 0 ? "printing-active" : ""}`}>
          <span className="pulse" aria-hidden="true" />
          {printing === 0
            ? "Ninguna cama imprimiendo"
            : printing === 1
              ? "1 cama imprimiendo"
              : `${printing} camas imprimiendo`}
        </p>
      </header>

      <main className="columns">
        <TasksPanel
          tasks={state.tasks}
          deliveries={state.deliveries}
          dispatch={dispatch}
          showUndo={setUndo}
        />
        <FlowsPanel
          flows={state.flows}
          printers={state.printers}
          dispatch={dispatch}
          showUndo={setUndo}
        />
      </main>

      {undo && (
        <div className="toast" role="status">
          <span className="toast-message">{undo.message}</span>
          <button
            className="toast-undo"
            onClick={() => {
              dispatch(undo.action);
              setUndo(null);
            }}
          >
            Deshacer
          </button>
        </div>
      )}
    </div>
  );
}
