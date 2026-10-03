// Option parsing for the offline scripts. Both classification scripts take the same --key=value
// flags, and a typo must fail before the run starts rather than quietly changing what runs:
// this one spends money per batch.
export function parseOptions(argv = [], allowed = []) {
 const options = new Map();
 for (const argument of argv) {
  if (!argument.startsWith('--')) throw new Error(`Invalid option: ${argument}`);
  const [key, value = 'true'] = argument.slice(2).split('=');
  // An unknown name is a typo far more often than it is a new flag, and a silently ignored
  // flag means the run does something other than what was asked for.
  if (!key || !allowed.includes(key)) throw new Error(`Unknown option: --${key}`);
  options.set(key, value);
 }
 return options;
}

// A number outside its bounds is an error, never a silently different run.
export function readNumber(options, key, fallback, {min = 0, max = Number.MAX_SAFE_INTEGER, integer = true} = {}) {
 const raw = options.get(key);
 if (raw === undefined) return fallback;
 const value = Number(raw);
 if (!Number.isFinite(value) || value < min || value > max || integer && !Number.isInteger(value)) throw new Error(`Invalid --${key}: ${raw}`);
 return value;
}

// --force is true, --force=false is not: a boolean flag that ignored its value would be the
// same silent surprise this module exists to remove.
export function readFlag(options, key) {
 return options.has(key) && options.get(key) !== 'false';
}