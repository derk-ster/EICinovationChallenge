import "server-only";
import { backend } from "../env";
import { createLocalStore } from "./local";
import { createSupabaseStore } from "./supabase";
import type { DataStore } from "./types";

let store: DataStore | null = null;

/** Returns the configured data store. Throws ConfigError if production storage is missing. */
export function getStore(): DataStore {
  if (store) return store;
  store = backend() === "supabase" ? createSupabaseStore() : createLocalStore();
  return store;
}

export { StoreError } from "./types";
export type { DataStore } from "./types";
