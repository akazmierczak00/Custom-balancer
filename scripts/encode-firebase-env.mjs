import { readFileSync } from "fs";

const file = process.argv[2] ?? "serviceAccount.json";
const raw = readFileSync(file, "utf8");
const base64 = Buffer.from(raw, "utf8").toString("base64");

console.log("Add this to Vercel as FIREBASE_SERVICE_ACCOUNT_JSON_BASE64:\n");
console.log(base64);
