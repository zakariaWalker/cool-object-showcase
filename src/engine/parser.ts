// ===== Recursive Descent Parser =====
// Converts tokens into an AST
// Handles: implicit multiplication (2x, 3(x+1)), operator precedence, unary minus

import { Token, tokenize } from "./tokenizer";
import { ASTNode } from "./types";

class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private consume(expected?: string): Token {
    const token = this.tokens[this.pos];
    if (expected && token.type !== expected) {
      throw new Error(`Expected ${expected} but got ${token.type} ('${token.value}') at position ${token.position}`);
    }
    this.pos++;
    return token;
  }

  // expression = term (('+' | '-') term)*
  parseExpression(): ASTNode {
    let left = this.parseTerm();

    while (this.peek().type === "PLUS" || this.peek().type === "MINUS") {
      const op = this.consume().value as "+" | "-";
      const right = this.parseTerm();
      left = { type: "binaryOp", op, left, right };
    }

    return left;
  }

  // term = power (('*' | '/') power)*
  // Also handles implicit multiplication: 2x, 2(x+1), x(x+1)
  private parseTerm(): ASTNode {
    let left = this.parsePower();

    while (true) {
      const next = this.peek();
      if (next.type === "STAR" || next.type === "SLASH") {
        const op = this.consume().value as "*" | "/";
        const right = this.parsePower();
        left = { type: "binaryOp", op, left, right };
      } else if (
        next.type === "NUMBER" ||
        next.type === "VARIABLE" ||
        next.type === "LPAREN"
      ) {
        // Implicit multiplication
        const right = this.parsePower();
        left = { type: "binaryOp", op: "*", left, right };
      } else {
        break;
      }
    }

    return left;
  }

  // power = unary ('^' power)?
  private parsePower(): ASTNode {
    let base = this.parseUnary();

    if (this.peek().type === "CARET") {
      this.consume();
      const exp = this.parsePower(); // right-associative
      base = { type: "binaryOp", op: "^", left: base, right: exp };
    }

    return base;
  }

  // unary = '-' unary | atom
  private parseUnary(): ASTNode {
    if (this.peek().type === "MINUS") {
      this.consume();
      const operand = this.parseUnary();
      return { type: "unaryOp", op: "-", operand };
    }
    return this.parseAtom();
  }

  // atom = NUMBER | VARIABLE | VARIABLE '(' args ')' | '(' expression ')'
  private parseAtom(): ASTNode {
    const token = this.peek();

    if (token.type === "NUMBER") {
      this.consume();
      return { type: "number", value: parseFloat(token.value) };
    }

    if (token.type === "VARIABLE") {
      this.consume();
      // Check if it's a function call
      if (this.peek().type === "LPAREN") {
        // Could be function call like sin(x) or implicit mul like x(x+1)
        // Treat known functions as function calls
        const knownFunctions = ["sin", "cos", "tan", "sqrt", "abs", "ln", "log", "exp"];
        if (knownFunctions.includes(token.value)) {
          this.consume("LPAREN");
          const args: ASTNode[] = [this.parseExpression()];
          while (this.peek().type === "COMMA") {
            this.consume();
            args.push(this.parseExpression());
          }
          this.consume("RPAREN");
          return { type: "functionCall", name: token.value, args };
        }
      }
      return { type: "variable", name: token.value };
    }

    if (token.type === "LPAREN") {
      this.consume();
      const expr = this.parseExpression();
      this.consume("RPAREN");
      return expr;
    }

    throw new Error(`Unexpected token ${token.type} ('${token.value}') at position ${token.position}`);
  }
}

export function parse(input: string): ASTNode {
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  const ast = parser.parseExpression();
  return ast;
}
