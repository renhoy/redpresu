/**
 * Crypto Helpers - Generación segura de IDs y passwords
 *
 * SECURITY (VULN-018): Usar Web Crypto API en lugar de Math.random()
 * Math.random() NO es criptográficamente seguro y puede ser predecible
 *
 * Referencias:
 * - MDN Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
 * - OWASP Cryptographic Storage: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
 */

/**
 * Genera un UUID v4 criptográficamente seguro
 *
 * SECURITY (VULN-018): Usa crypto.randomUUID() nativo del navegador/Node.js
 * Compatible con Node.js 16.7.0+ y todos los navegadores modernos
 *
 * @returns UUID v4 (formato: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 * @example
 * ```typescript
 * const id = generateSecureUUID() // "a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789"
 * ```
 */
export function generateSecureUUID(): string {
  // Node.js 16.7.0+ y navegadores modernos tienen crypto.randomUUID()
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback para entornos sin randomUUID (muy raro)
  // Generar UUID v4 manualmente usando getRandomValues
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version (4) y variant bits según RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

  // Convertir bytes a formato UUID
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Genera un ID corto aleatorio criptográficamente seguro
 *
 * SECURITY (VULN-018): Usa crypto.getRandomValues() en lugar de Math.random()
 *
 * @param length - Longitud del ID (por defecto 9 caracteres)
 * @returns ID aleatorio (ejemplo: "x7k2m9p4q")
 * @example
 * ```typescript
 * const id = generateSecureId() // "a1b2c3d4e"
 * const longId = generateSecureId(16) // "a1b2c3d4e5f6g7h8"
 * ```
 */
export function generateSecureId(length: number = 9): string {
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let result = "";
  for (let i = 0; i < length; i++) {
    // Usar módulo para mapear bytes a caracteres del charset
    result += charset[bytes[i] % charset.length];
  }

  return result;
}

/**
 * Genera un ID único con timestamp y parte aleatoria segura
 *
 * SECURITY (VULN-018): Combina timestamp con ID aleatorio seguro
 * Útil para IDs que deben ser únicos y ordenables por tiempo
 *
 * @param prefix - Prefijo opcional (ej: "link", "user", "doc")
 * @returns ID único (formato: prefix-timestamp-random)
 * @example
 * ```typescript
 * const linkId = generateTimestampId("link") // "link-1705756800000-a1b2c3d4e"
 * const userId = generateTimestampId("user") // "user-1705756800000-x7k2m9p4q"
 * ```
 */
export function generateTimestampId(prefix?: string): string {
  const timestamp = Date.now();
  const randomPart = generateSecureId(9);

  if (prefix) {
    return `${prefix}-${timestamp}-${randomPart}`;
  }

  return `${timestamp}-${randomPart}`;
}

/**
 * Genera un password aleatorio criptográficamente seguro
 *
 * SECURITY (VULN-018): Usa crypto.getRandomValues() para selección de caracteres
 * El password generado incluye:
 * - Letras mayúsculas (A-Z)
 * - Letras minúsculas (a-z)
 * - Números (0-9)
 * - Símbolos especiales (!@#$%^&*()_+-=[]{}|;:,.<>?)
 *
 * @param length - Longitud del password (mínimo 8, recomendado 12+)
 * @param includeSymbols - Incluir símbolos especiales (por defecto true)
 * @returns Password aleatorio seguro
 * @throws Error si length < 8
 * @example
 * ```typescript
 * const pwd = generateSecurePassword(12) // "A7b@9Xk!2mP#"
 * const pwdNoSymbols = generateSecurePassword(12, false) // "A7b9Xk2mPzQ1"
 * ```
 */
export function generateSecurePassword(
  length: number = 12,
  includeSymbols: boolean = true
): string {
  if (length < 8) {
    throw new Error("Password length must be at least 8 characters");
  }

  // Definir sets de caracteres
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  // Construir charset según configuración
  let charset = uppercase + lowercase + numbers;
  if (includeSymbols) {
    charset += symbols;
  }

  // Generar bytes aleatorios
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  // Construir password
  let password = "";
  for (let i = 0; i < length; i++) {
    // Usar módulo para mapear bytes a caracteres
    password += charset[bytes[i] % charset.length];
  }

  // GARANTIZAR que el password incluye al menos:
  // - 1 mayúscula
  // - 1 minúscula
  // - 1 número
  // - 1 símbolo (si includeSymbols = true)
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = includeSymbols ? /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password) : true;

  // Si falta algún requisito, regenerar recursivamente
  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
    return generateSecurePassword(length, includeSymbols);
  }

  return password;
}

/**
 * Genera un número aleatorio criptográficamente seguro
 *
 * SECURITY (VULN-018): Usa crypto.getRandomValues() en lugar de Math.random()
 *
 * @param min - Valor mínimo (inclusive)
 * @param max - Valor máximo (inclusive)
 * @returns Número aleatorio entre min y max
 * @example
 * ```typescript
 * const dice = generateSecureRandomInt(1, 6) // 1-6
 * const percentage = generateSecureRandomInt(0, 100) // 0-100
 * ```
 */
export function generateSecureRandomInt(min: number, max: number): number {
  if (min > max) {
    throw new Error("min must be less than or equal to max");
  }

  const range = max - min + 1;
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);

  // Usar módulo para mapear a rango deseado
  return min + (bytes[0] % range);
}

/**
 * Genera un token aleatorio hexadecimal
 *
 * SECURITY (VULN-018): Útil para tokens de sesión, API keys, etc.
 *
 * @param byteLength - Número de bytes aleatorios (por defecto 32)
 * @returns Token hexadecimal (length = byteLength * 2)
 * @example
 * ```typescript
 * const token = generateSecureToken(32) // 64 caracteres hex
 * const apiKey = generateSecureToken(16) // 32 caracteres hex
 * ```
 */
export function generateSecureToken(byteLength: number = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Selecciona un elemento aleatorio de un array de forma segura
 *
 * SECURITY (VULN-018): Usa crypto.getRandomValues() para selección
 *
 * @param array - Array de elementos
 * @returns Elemento aleatorio del array
 * @throws Error si array está vacío
 * @example
 * ```typescript
 * const colors = ["red", "green", "blue"]
 * const randomColor = getSecureRandomElement(colors) // "green"
 * ```
 */
export function getSecureRandomElement<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error("Array must not be empty");
  }

  const index = generateSecureRandomInt(0, array.length - 1);
  return array[index];
}

/**
 * Mezcla un array de forma aleatoria y segura (Fisher-Yates shuffle)
 *
 * SECURITY (VULN-018): Usa crypto.getRandomValues() para shuffle
 *
 * @param array - Array a mezclar
 * @returns Nuevo array mezclado (no muta el original)
 * @example
 * ```typescript
 * const deck = [1, 2, 3, 4, 5]
 * const shuffled = secureShuffleArray(deck) // [3, 1, 5, 2, 4]
 * ```
 */
export function secureShuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = generateSecureRandomInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}
