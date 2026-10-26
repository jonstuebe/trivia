/** Everything the game remembers on the device, in localStorage. */
export { createMemoryBackend, type StorageBackend } from "./backend";
export {
  createDeviceStorage,
  STORAGE_KEYS,
  type DeviceStorage,
  type DeviceStorageOptions,
  type SavedGameFormat,
} from "./device-storage";
export { BACKUP_SUFFIX, createVersionedKey, type Migration, type VersionedKey } from "./versioned-key";
