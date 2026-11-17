export const PRINTERS = ["Bambu Lab", "K1C"] as const;
export type Printer = (typeof PRINTERS)[number];

export const BED_STATUSES = ["pendiente", "imprimiendo", "lista"] as const;
export type BedStatus = (typeof BED_STATUSES)[number];

export const COLORS = {
  naranja: "#ff7a45",
  amarillo: "#f2c14e",
  verde: "#4fd08a",
  cian: "#3ec6d4",
  azul: "#5b8cff",
  morado: "#a47dff",
  rosa: "#ff6fb0",
  rojo: "#ff5c5c",
} as const;
export type ColorKey = keyof typeof COLORS;
export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];

export type Task = { id: string; title: string };
export type Bed = { id: string; printer: Printer; status: BedStatus };
export type Flow = { id: string; name: string; beds: Bed[] };
// `date` is a local calendar day written as YYYY-MM-DD.
export type Delivery = {
  id: string;
  title: string;
  date: string;
  color: ColorKey;
};
export type DeliveryPatch = Partial<Omit<Delivery, "id">>;
export type State = { tasks: Task[]; flows: Flow[]; deliveries: Delivery[] };

export type Action =
  | { type: "addTask"; title: string }
  | { type: "renameTask"; id: string; title: string }
  | { type: "removeTask"; id: string }
  | { type: "restoreTask"; task: Task; index: number }
  | { type: "addFlow"; name: string; printers: Printer[] }
  | { type: "renameFlow"; id: string; name: string }
  | { type: "removeFlow"; id: string }
  | { type: "restoreFlow"; flow: Flow; index: number }
  | { type: "addBed"; flowId: string; printer: Printer }
  | { type: "removeBed"; flowId: string; bedId: string }
  | { type: "setBedStatus"; flowId: string; bedId: string; status: BedStatus }
  | { type: "setBedPrinter"; flowId: string; bedId: string; printer: Printer }
  | { type: "addDelivery"; delivery: Omit<Delivery, "id"> }
  | { type: "updateDelivery"; id: string; patch: DeliveryPatch }
  | { type: "removeDelivery"; id: string }
  | { type: "restoreDelivery"; delivery: Delivery };

const STORAGE_KEY = "apptareas.v1";

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const newBed = (printer: Printer): Bed => ({
  id: newId(),
  printer,
  status: "pendiente",
});

const insertAt = <T,>(list: T[], item: T, index: number) => [
  ...list.slice(0, index),
  item,
  ...list.slice(index),
];

const initialState = (): State => ({
  tasks: [
    "Configurar proyecto de casco de Bedari",
    "Imprimir lamparas",
    "Imprimir Casco",
    "Configurar novios de pastel",
    "Configurar Archivos de Gojo",
    "Imprimir Gojo",
  ].map((title) => ({ id: newId(), title })),
  flows: [
    {
      id: newId(),
      name: "pikachu",
      beds: (["Bambu Lab", "Bambu Lab", "K1C"] as Printer[]).map(newBed),
    },
  ],
  deliveries: [],
});

export function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (Array.isArray(parsed.tasks) && Array.isArray(parsed.flows)) {
        // Older saves kept a date and color on tasks and flows; drop them.
        return {
          tasks: parsed.tasks.map(({ id, title }) => ({ id, title })),
          flows: parsed.flows.map(({ id, name, beds }) => ({ id, name, beds })),
          deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : [],
        };
      }
    }
  } catch {
    // Unreadable storage falls through to the starting data.
  }
  return initialState();
}

export function saveState(state: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The app stays usable for this session if storage is unavailable.
  }
}

function updateBeds(
  state: State,
  flowId: string,
  update: (beds: Bed[]) => Bed[],
): State {
  return {
    ...state,
    flows: state.flows.map((flow) =>
      flow.id === flowId ? { ...flow, beds: update(flow.beds) } : flow,
    ),
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "addTask":
      return {
        ...state,
        tasks: [...state.tasks, { id: newId(), title: action.title }],
      };
    case "renameTask":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id ? { ...task, title: action.title } : task,
        ),
      };
    case "removeTask":
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.id),
      };
    case "restoreTask":
      return {
        ...state,
        tasks: insertAt(state.tasks, action.task, action.index),
      };
    case "addFlow":
      return {
        ...state,
        flows: [
          ...state.flows,
          {
            id: newId(),
            name: action.name,
            beds: action.printers.map(newBed),
          },
        ],
      };
    case "renameFlow":
      return {
        ...state,
        flows: state.flows.map((flow) =>
          flow.id === action.id ? { ...flow, name: action.name } : flow,
        ),
      };
    case "removeFlow":
      return {
        ...state,
        flows: state.flows.filter((flow) => flow.id !== action.id),
      };
    case "restoreFlow":
      return {
        ...state,
        flows: insertAt(state.flows, action.flow, action.index),
      };
    case "addBed":
      return updateBeds(state, action.flowId, (beds) => [
        ...beds,
        newBed(action.printer),
      ]);
    case "removeBed":
      return updateBeds(state, action.flowId, (beds) =>
        beds.filter((bed) => bed.id !== action.bedId),
      );
    case "setBedStatus":
      return updateBeds(state, action.flowId, (beds) =>
        beds.map((bed) =>
          bed.id === action.bedId ? { ...bed, status: action.status } : bed,
        ),
      );
    case "setBedPrinter":
      return updateBeds(state, action.flowId, (beds) =>
        beds.map((bed) =>
          bed.id === action.bedId ? { ...bed, printer: action.printer } : bed,
        ),
      );
    case "addDelivery":
      return {
        ...state,
        deliveries: [...state.deliveries, { id: newId(), ...action.delivery }],
      };
    case "updateDelivery":
      return {
        ...state,
        deliveries: state.deliveries.map((delivery) =>
          delivery.id === action.id
            ? { ...delivery, ...action.patch }
            : delivery,
        ),
      };
    case "removeDelivery":
      return {
        ...state,
        deliveries: state.deliveries.filter(
          (delivery) => delivery.id !== action.id,
        ),
      };
    case "restoreDelivery":
      return {
        ...state,
        deliveries: [...state.deliveries, action.delivery],
      };
  }
}
