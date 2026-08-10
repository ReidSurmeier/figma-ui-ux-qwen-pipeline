export const CLUBS = Object.freeze([
  "7 iron",
  "6 iron",
  "5 iron",
  "4 iron",
  "3 wood",
  "driver",
  "putter",
  "pitching wedge",
  "sand wedge",
  "hybrid",
  "lob wedge",
]);

export function createUIState() {
  return {
    openMenu: null,
    tool: "select",
    zoom: 128,
    club: "7 iron",
    libraryStart: 0,
    age: 36,
    viewOffset: { x: 0, y: 0 },
    panel: "swing",
    parameters: {
      rotation: 0,
      loft: 34,
      tempo: 72,
    },
    parts: {
      head: "cavity back",
      shaft: "regular",
      grip: "standard",
    },
    visibleRegions: { library: true, graph: true, toolbar: true },
    reducedMotion: false,
    dialog: null,
    windowMode: "normal",
  };
}

export function reduceUI(state, action) {
  switch (action.type) {
    case "TOGGLE_MENU":
      return {
        ...state,
        openMenu: state.openMenu === action.menu ? null : action.menu,
      };
    case "SET_TOOL":
      return { ...state, tool: action.tool, openMenu: null };
    case "SET_ZOOM":
      return {
        ...state,
        zoom: Math.max(64, Math.min(256, Number(action.zoom) || 128)),
        openMenu: null,
      };
    case "SCALE_TO_FIT":
      return { ...state, zoom: 100, openMenu: null };
    case "SELECT_CLUB":
      return { ...state, club: action.club, openMenu: null };
    case "SCROLL_LIBRARY":
      return {
        ...state,
        libraryStart: Math.max(0, Math.min(4, Math.round(Number(action.start) || 0))),
      };
    case "SET_AGE":
      return {
        ...state,
        age: Math.max(1, Math.min(120, Math.round(Number(action.age) || 1))),
      };
    case "STEP_AGE":
      return {
        ...state,
        age: Math.max(1, Math.min(120, state.age + Number(action.delta || 0))),
      };
    case "PAN_VIEW":
      return {
        ...state,
        viewOffset: {
          x: Math.max(-80, Math.min(80, Number(action.x) || 0)),
          y: Math.max(-60, Math.min(60, Number(action.y) || 0)),
        },
      };
    case "SET_PANEL":
      return { ...state, panel: action.panel, openMenu: null };
    case "SET_PARAMETER": {
      const limits = {
        rotation: [-45, 45],
        loft: [8, 64],
        tempo: [40, 120],
      };
      const [minimum, maximum] = limits[action.name] || [0, 100];
      return {
        ...state,
        parameters: {
          ...state.parameters,
          [action.name]: Math.max(minimum, Math.min(maximum, Number(action.value) || 0)),
        },
      };
    }
    case "SET_PART":
      return {
        ...state,
        parts: { ...state.parts, [action.name]: action.value },
      };
    case "TOGGLE_REGION":
      return {
        ...state,
        visibleRegions: {
          ...state.visibleRegions,
          [action.region]: !state.visibleRegions[action.region],
        },
        openMenu: null,
      };
    case "TOGGLE_REDUCED_MOTION":
      return { ...state, reducedMotion: !state.reducedMotion, openMenu: null };
    case "OPEN_DIALOG":
      return { ...state, dialog: action.dialog, openMenu: null };
    case "CLOSE_DIALOG":
      return { ...state, dialog: null };
    case "SET_WINDOW_MODE":
      return { ...state, windowMode: action.mode, openMenu: null, dialog: null };
    default:
      return state;
  }
}
