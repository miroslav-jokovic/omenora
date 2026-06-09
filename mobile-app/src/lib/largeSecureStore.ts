import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
import * as aesjs from 'aes-js'

/**
 * Encrypted storage adapter for the Supabase auth session.
 *
 * Expo SecureStore caps values at 2048 bytes; Supabase sessions (JWT + refresh
 * token + user object) can exceed it. Per Supabase's official Expo guide: keep a
 * random AES-256 key in SecureStore (hardware-backed) and store the AES-encrypted
 * value in AsyncStorage (no size limit). Cleartext tokens never touch disk.
 *
 * RNG uses expo-crypto.getRandomBytes (already a dependency), avoiding the
 * react-native-get-random-values polyfill the upstream example relies on.
 */
export class LargeSecureStore {
  private async _encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = Crypto.getRandomBytes(32) // AES-256
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1))
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value))
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey))
    return aesjs.utils.hex.fromBytes(encryptedBytes)
  }

  private async _decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key)
    if (!encryptionKeyHex) return null
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    )
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value))
    return aesjs.utils.utf8.fromBytes(decryptedBytes)
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key)
    if (!encrypted) return null
    return this._decrypt(key, encrypted)
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this._encrypt(key, value)
    await AsyncStorage.setItem(key, encrypted)
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key)
    await SecureStore.deleteItemAsync(key)
  }
}
