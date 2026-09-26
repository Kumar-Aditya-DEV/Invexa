const crypto = require('crypto');
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  bcrypt = require('bcryptjs');
}

const ADJECTIVES = [
  'Amber', 'Bright', 'Cedar', 'Delta', 'Eagle', 'Frost', 'Grove', 'Haven',
  'Iris', 'Jasper', 'Kite', 'Luna', 'Maple', 'Nova', 'Opal', 'Pine',
  'Quartz', 'River', 'Solar', 'Topaz', 'Vivid', 'Willow', 'Brave', 'Swift',
];

const NOUNS = [
  'Badge', 'Beacon', 'Breeze', 'Castle', 'Canyon', 'Falcon', 'Forest', 'Harbor',
  'Island', 'Meadow', 'Orbit', 'Peak', 'Ridge', 'Shadow', 'Shield', 'Summit',
  'Valley', 'Venture', 'Vessel', 'Voyage', 'Anchor', 'Compass',
];

/**
 * Generates a secure, human-typeable temporary password.
 * Format: Adjective-Noun-4digits (e.g., "Solar-Falcon-7392").
 * Easy to read off a screen and type without ambiguous characters.
 */
function generateTempPassword() {
  const adj = ADJECTIVES[crypto.randomInt(0, ADJECTIVES.length)];
  const noun = NOUNS[crypto.randomInt(0, NOUNS.length)];
  const digits = crypto.randomInt(1000, 9999);
  return `${adj}-${noun}-${digits}`;
}

/**
 * Hashes a plain-text password using bcrypt.
 * @param {string} plainPassword 
 * @returns {Promise<string>}
 */
async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const saltRounds = 10;
  return bcrypt.hash(plainPassword, saltRounds);
}

/**
 * Compares a plain-text password against a bcrypt hash.
 * @param {string} plainPassword 
 * @param {string} hashedPassword 
 * @returns {Promise<boolean>}
 */
async function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  generateTempPassword,
  hashPassword,
  verifyPassword,
};
