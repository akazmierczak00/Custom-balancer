"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { subscribeToUsers } from "@/lib/firebase/firestore";
import { useVisibleSubscription } from "@/hooks/use-visible-subscription";
import { getLobbyUserUids } from "@/lib/lobby/lobby-user-uids";
import { Lobby, UserProfile } from "@/types";

const LobbyUsersContext = createContext<Record<string, UserProfile> | null>(null);

export function LobbyUsersProvider({
  lobby,
  children,
}: {
  lobby: Lobby;
  children: React.ReactNode;
}) {
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const uids = useMemo(() => getLobbyUserUids(lobby), [lobby]);

  useVisibleSubscription(() => subscribeToUsers(uids, setUsers), [uids]);

  return (
    <LobbyUsersContext.Provider value={users}>{children}</LobbyUsersContext.Provider>
  );
}

export function useLobbyUsers() {
  return useContext(LobbyUsersContext);
}
