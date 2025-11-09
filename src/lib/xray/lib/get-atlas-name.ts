import { publicKeyMappings } from "../config";

// @ts-ignore
export const getAtlasName = (publicKey) => publicKeyMappings[publicKey];
