// ===== Tokenizer =====
// Converts raw text into a stream of tokens

export type TokenType =
  | "NUMBER"
  | "VARIABLE"
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "CARET"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "EQUALS"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }

    // Numbers (including decimals)
    if (/[0-9]/.test(input[i])) {
      let num = "";
      const start = i;
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i];
        i++;
      }
      tokens.push({ type: "NUMBER", value: num, position: start });
      continue;
    }

    // Variables and function names
    if (/[a-zA-Z_]/.test(input[i])) {
      let name = "";
      const start = i;
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        name += input[i];
        i++;
      }
      tokens.push({ type: "VARIABLE", value: name, position: start });
      continue;
    }

    // Single-character tokens
    const charMap: Record<string, TokenType> = {
      "+": "PLUS",
      "-": "MINUS",
      "*": "STAR",
      "/": "SLASH",
      "^": "CARET",
      "(": "LPAREN",
      ")": "RPAREN",
      ",": "COMMA",
      "=": "EQUALS",
    };

    if (input[i] in charMap) {
      tokens.push({ type: charMap[input[i]], value: input[i], position: i });
      i++;
      continue;
    }

    throw new Error(`Unexpected character '${input[i]}' at position ${i}`);
  }

  tokens.push({ type: "EOF", value: "", position: i });
  return tokens;
}
