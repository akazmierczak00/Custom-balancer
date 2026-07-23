/**
 * Dump / inject champion picks into an old lobby's roundHistory.
 *
 * Usage:
 *   node scripts/inject-round-picks.mjs dump Ha8lhl
 *   node scripts/inject-round-picks.mjs inject Ha8lhl path/to/picks.json
 *
 * picks.json example:
 * {
 *   "1": {
 *     "Adrian": "Ahri",
 *     "Kofeja": "Yuumi"
 *   }
 * }
 * Keys = roundNumber, values = nick → champion name (or ddragon id).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) throw new Error("Brak .env.local");
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function getServiceAccount(env) {
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64) {
    return JSON.parse(
      Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64, "base64").toString(
        "utf8"
      )
    );
  }
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  throw new Error(
    "Ustaw FIREBASE_SERVICE_ACCOUNT_JSON lub _BASE64 w .env.local"
  );
}

function initDb(env) {
  if (getApps().length === 0) {
    const sa = getServiceAccount(env);
    initializeApp({
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    });
  }
  return getFirestore();
}

async function findLobby(db, prefix) {
  const snap = await db.collection("lobbies").get();
  const matches = snap.docs.filter((d) => d.id.startsWith(prefix));
  if (matches.length === 0) throw new Error(`Nie znaleziono lobby ${prefix}`);
  if (matches.length > 1) {
    console.log(
      "Wiele trafień:",
      matches.map((d) => d.id).join(", ")
    );
  }
  const doc = matches[0];
  return { id: doc.id, data: doc.data() };
}

function emptyPicks() {
  return {
    top: null,
    jungle: null,
    mid: null,
    adc: null,
    support: null,
  };
}

async function loadChampionCatalog() {
  const versionsRes = await fetch(
    "https://ddragon.leagueoflegends.com/api/versions.json"
  );
  const versions = await versionsRes.json();
  const version = versions[0];
  const champRes = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
  );
  const file = await champRes.json();
  const byName = new Map();
  const byId = new Map();
  for (const c of Object.values(file.data)) {
    const entry = {
      id: c.id,
      key: c.key,
      name: c.name,
      iconUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.image.full}`,
    };
    byId.set(c.id.toLowerCase(), entry);
    byName.set(c.name.toLowerCase(), entry);
  }
  return { byName, byId };
}

function resolveChampion(catalog, raw) {
  const q = String(raw).trim().toLowerCase();
  return catalog.byId.get(q) ?? catalog.byName.get(q) ?? null;
}

function dumpLobby(lobbyId, data) {
  console.log(`Lobby ${lobbyId}`);
  console.log(`status: ${data.status}`);
  const rounds = data.roundHistory ?? [];
  if (!rounds.length) {
    console.log("Brak rund w roundHistory.");
    return;
  }
  for (const round of rounds) {
    console.log(`\n=== Runda ${round.roundNumber} (winner Team ${round.winnerTeam}) ===`);
    console.log("Team 1:");
    for (const p of round.team1 ?? []) {
      console.log(`  ${p.role.padEnd(8)} ${p.nick}`);
    }
    console.log("Team 2:");
    for (const p of round.team2 ?? []) {
      console.log(`  ${p.role.padEnd(8)} ${p.nick}`);
    }
    if (round.picks) {
      console.log("(już ma picks)");
    }
  }
  console.log(`\nPrzygotuj picks.json np.:`);
  console.log(
    JSON.stringify(
      Object.fromEntries(
        rounds.map((r) => [
          String(r.roundNumber),
          Object.fromEntries(
            [...(r.team1 ?? []), ...(r.team2 ?? [])].map((p) => [p.nick, ""])
          ),
        ])
      ),
      null,
      2
    )
  );
}

async function injectPicks(db, lobbyId, data, picksByRound) {
  const catalog = await loadChampionCatalog();
  const rounds = data.roundHistory ?? [];
  if (!rounds.length) throw new Error("Brak rund");

  const nextHistory = rounds.map((round) => {
    const mapping = picksByRound[String(round.roundNumber)] ?? picksByRound[round.roundNumber];
    if (!mapping) return round;

    const team1Picks = emptyPicks();
    const team2Picks = emptyPicks();
    const allPlayers = [
      ...(round.team1 ?? []).map((p) => ({ ...p, team: 1 })),
      ...(round.team2 ?? []).map((p) => ({ ...p, team: 2 })),
    ];

    for (const [nick, champRaw] of Object.entries(mapping)) {
      if (!champRaw || !String(champRaw).trim()) continue;
      const player = allPlayers.find(
        (p) => p.nick.toLowerCase() === nick.toLowerCase()
      );
      if (!player) {
        throw new Error(
          `Runda ${round.roundNumber}: nie znaleziono nicku "${nick}"`
        );
      }
      const champ = resolveChampion(catalog, champRaw);
      if (!champ) {
        throw new Error(
          `Runda ${round.roundNumber}: nie znaleziono championa "${champRaw}"`
        );
      }
      const side = player.team === 1 ? team1Picks : team2Picks;
      side[player.role] = {
        id: champ.id,
        key: champ.key,
        name: champ.name,
        iconUrl: champ.iconUrl,
      };
      console.log(
        `R${round.roundNumber} ${player.nick} (${player.role}) → ${champ.name}`
      );
    }

    return {
      ...round,
      picks: { team1: team1Picks, team2: team2Picks },
    };
  });

  await db.collection("lobbies").doc(lobbyId).update({
    roundHistory: nextHistory,
    updatedAt: new Date(),
  });
  console.log(`\nZapisano picks w lobby ${lobbyId}`);
}

async function main() {
  const [cmd, prefix, picksPath] = process.argv.slice(2);
  if (!cmd || !prefix) {
    console.error(
      "Użycie:\n  node scripts/inject-round-picks.mjs dump Ha8lhl\n  node scripts/inject-round-picks.mjs inject Ha8lhl picks.json"
    );
    process.exit(1);
  }

  const env = loadEnvLocal();
  const db = initDb(env);
  const { id, data } = await findLobby(db, prefix);

  if (cmd === "dump") {
    dumpLobby(id, data);
    return;
  }

  if (cmd === "inject") {
    if (!picksPath) throw new Error("Podaj ścieżkę do picks.json");
    const picks = JSON.parse(readFileSync(resolve(picksPath), "utf8"));
    await injectPicks(db, id, data, picks);
    return;
  }

  throw new Error(`Nieznana komenda: ${cmd}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
