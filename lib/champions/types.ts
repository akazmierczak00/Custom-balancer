import { LoLRole } from "@/types";

export type ChampionLaneFilter = LoLRole | "all";

export type ChampionCatalogEntry = {
  id: string;
  key: string;
  name: string;
  iconUrl: string;
  lanes: LoLRole[];
};
