"use client";

import {
  Columns2,
  Crosshair,
  Eye,
  Flag,
  GitBranch,
  LayoutGrid,
  Shuffle,
  Sparkles,
  Swords,
  ThumbsUp,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminSetLobbyPhase } from "@/lib/lobby/service";
import { Lobby, LobbyStatus } from "@/types";

const ADMIN_PHASES: {
  status: LobbyStatus;
  label: string;
  icon: typeof Eye;
}[] = [
  { status: "confirming", label: "Potwierdzenie", icon: UserCheck },
  { status: "drafting", label: "Draft", icon: Shuffle },
  { status: "reveal", label: "Reveal ról", icon: Eye },
  { status: "overview", label: "Przegląd składu", icon: LayoutGrid },
  { status: "voting_lineup", label: "Głosowanie składu", icon: ThumbsUp },
  { status: "reshuffle_reveal", label: "Reveal A/B", icon: Columns2 },
  { status: "voting_proposals", label: "Głosowanie A/B", icon: GitBranch },
  { status: "weakness_reveal", label: "Losowanie osłabień", icon: Sparkles },
  { status: "weakness_pick", label: "Wybór osłabień", icon: Crosshair },
  { status: "final", label: "Finał", icon: Flag },
  { status: "playing", label: "Gra", icon: Swords },
];

interface AdminLobbyControlsProps {
  lobby: Lobby;
}

export function AdminLobbyControls({ lobby }: AdminLobbyControlsProps) {
  const jump = async (phase: LobbyStatus) => {
    try {
      await adminSetLobbyPhase(lobby.id, phase);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd przejścia fazy");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {ADMIN_PHASES.map(({ status, label, icon: Icon }) => (
        <Button
          key={status}
          type="button"
          variant={lobby.status === status ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0"
          title={label}
          aria-label={label}
          onClick={() => jump(status)}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  );
}
