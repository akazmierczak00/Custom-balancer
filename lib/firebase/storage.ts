import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase/config";

export async function uploadLobbyRoundScreenshot(
  lobbyId: string,
  roundNumber: number,
  file: File
): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const storageRef = ref(
    getFirebaseStorage(),
    `lobbies/${lobbyId}/rounds/${roundNumber}/${Date.now()}-${safeName}`
  );

  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
