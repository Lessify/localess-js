export function proxyURIFromEnv(): string | undefined {
  return (
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    undefined
  );
}

export const RESET = "\x1b[0m"
export const BRIGHT = "\x1b[1m"
export const DIM = "\x1b[2m"
export const UNDERSCORE = "\x1b[4m"
export const BLINK = "\x1b[5m"
export const REVERSE = "\x1b[7m"
export const HIDDEN = "\x1b[8m"

export const FG_BLACK = "\x1b[30m"
export const FG_RED = "\x1b[31m"
export const FG_GREEN = "\x1b[32m"
export const FG_YELLOW = "\x1b[33m"
export const FG_BLUE = "\x1b[34m"
export const FG_MAGENTA = "\x1b[35m"
export const FG_CYAN = "\x1b[36m"
export const FG_WHITE = "\x1b[37m"
export const FG_GRAY = "\x1b[90m"
export const FG_BRIGHT_RED = "\x1b[91m"
export const FG_BRIGHT_GREEN = "\x1b[92m"
export const FG_BRIGHT_YELLOW = "\x1b[93m"
export const FG_BRIGHT_BLUE = "\x1b[94m"
export const FG_BRIGHT_MAGENTA = "\x1b[95m"
export const FG_BRIGHT_CYAN = "\x1b[96m"
export const FG_BRIGHT_WHITE = "\x1b[97m"

export const BG_BLACK = "\x1b[40m"
export const BG_RED = "\x1b[41m"
export const BG_GREEN = "\x1b[42m"
export const BG_YELLOW = "\x1b[43m"
export const BG_BLUE = "\x1b[44m"
export const BG_MAGENTA = "\x1b[45m"
export const BG_CYAN = "\x1b[46m"
export const BG_WHITE = "\x1b[47m"
export const BG_GRAY = "\x1b[100m"

export const BG_BRIGHT_RED = "\x1b[101m"
export const BG_BRIGHT_GREEN = "\x1b[102m"
export const BG_BRIGHT_YELLOW = "\x1b[103m"
export const BG_BRIGHT_BLUE = "\x1b[104m"
export const BG_BRIGHT_MAGENTA = "\x1b[105m"
export const BG_BRIGHT_CYAN = "\x1b[106m"
export const BG_BRIGHT_WHITE = "\x1b[107m"

export const isBrowser = () => typeof window !== 'undefined';
export const isServer = () => typeof window === 'undefined';

export const isIframe = () => isBrowser() && window.self !== window.top;
