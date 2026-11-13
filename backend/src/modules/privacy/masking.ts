/**
 * Masks an email address revealing at most the first character of the local part.
 * Example: jane.doe@example.com -> j***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== "string") {
    return "***@***";
  }

  const atIndex = email.lastIndexOf("@");
  if (atIndex <= 0) {
    return "***@***";
  }

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);

  const firstChar = localPart.charAt(0);
  return `${firstChar}***@${domainPart}`;
}

/**
 * Masks a phone number revealing only the final two digits.
 * Example: +1 213 373 4253 -> +1 *** *** **53
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== "string") {
    return "***-**";
  }

  // Find all digit positions
  const chars = phone.split("");
  const digitIndices: number[] = [];

  for (let i = 0; i < chars.length; i++) {
    if (/\d/.test(chars[i]!)) {
      digitIndices.push(i);
    }
  }

  if (digitIndices.length === 0) {
    return "***-**";
  }

  // If 2 or fewer digits, mask all except the last 1-2
  const unmaskedCount = Math.min(2, digitIndices.length);
  const maskUntilIndex = digitIndices.length - unmaskedCount;

  // Check if string starts with a country code like "+1 " or "+44 "
  // If so, we can optionally preserve the country code prefix characters if desired,
  // or mask all digits prior to the last two.
  // The brief states: "The returned representation must reveal only the final two digits. Example: +1 *** *** **53"
  // So if starts with "+<countryDigits> ", preserve the "+<countryDigits> " and mask subsequent digits until last 2.
  let countryCodeEnd = 0;
  const countryMatch = phone.match(/^\+(\d{1,3})\s/);
  if (countryMatch && countryMatch[1]) {
    countryCodeEnd = countryMatch[0].length;
  }

  for (let i = 0; i < maskUntilIndex; i++) {
    const charIndex = digitIndices[i]!;
    if (charIndex >= countryCodeEnd) {
      chars[charIndex] = "*";
    }
  }

  return chars.join("");
}

/**
 * Masks secret tokens revealing only token type and up to first 4 characters.
 * Example: AKIAIOSFODNN7EXAMPLE -> AWS key: AKIA********
 */
export function maskToken(tokenType: string, token: string): string {
  if (!token || typeof token !== "string") {
    return `${tokenType}: [REDACTED]`;
  }

  if (tokenType.toLowerCase().includes("private key")) {
    return "Private key: [REDACTED PRIVATE KEY BLOCK]";
  }

  if (tokenType.toUpperCase() === "JWT") {
    const prefix = token.slice(0, 4);
    return `JWT: ${prefix}********`;
  }

  const prefix = token.slice(0, 4);
  return `${tokenType}: ${prefix}********`;
}

/**
 * Masks a payment card number revealing only the final 4 digits.
 * Example: 4111 1111 1111 1111 -> **** **** **** 1111
 */
export function maskCard(card: string): string {
  if (!card || typeof card !== "string") {
    return "**** **** **** ****";
  }

  const digitsOnly = card.replace(/\D/g, "");
  if (digitsOnly.length < 4) {
    return "****";
  }

  const lastFour = digitsOnly.slice(-4);

  // If card had space/hyphen formatting (e.g. 16 chars with 4-digit groups)
  if (card.includes(" ") || card.includes("-")) {
    const separator = card.includes(" ") ? " " : "-";
    const parts = card.split(separator);
    const maskedParts = parts.map((part, index) => {
      if (index === parts.length - 1) {
        // Last group
        const groupDigits = part.replace(/\D/g, "");
        if (groupDigits.length <= 4) return groupDigits;
        return "*".repeat(groupDigits.length - 4) + lastFour;
      }
      return "*".repeat(part.length);
    });
    return maskedParts.join(separator);
  }

  return "*".repeat(digitsOnly.length - 4) + lastFour;
}

/**
 * Masks a username to prevent exposing raw identifiers in reports.
 * Example: Jane.Doe -> J***e, admin -> a***n, li -> l*
 */
export function maskUsername(username: string): string {
  if (!username || typeof username !== "string") {
    return "***";
  }

  const clean = username.trim();
  if (clean.length <= 1) {
    return "*";
  }
  if (clean.length === 2) {
    return `${clean.charAt(0)}*`;
  }

  const first = clean.charAt(0);
  const last = clean.charAt(clean.length - 1);
  return `${first}***${last}`;
}
