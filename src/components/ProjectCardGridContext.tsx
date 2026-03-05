import { createContext } from "react";

export type ProjectCardGridContextValue = {
  expandedCardId: string | null;
  setExpandedCardId: (id: string | null) => void;
  collapseDelay: number;
  collapseTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
};

export const ProjectCardGridContext = createContext<ProjectCardGridContextValue | null>(null);
