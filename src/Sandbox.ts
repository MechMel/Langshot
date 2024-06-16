import { LangNode, token, and, or, optional, many } from "./Langshot";

class File extends LangNode.subtype(() => [Statement]) {
  // Add whatever getters, setters, and methods you want
  get exports() {
    const exportedVars: VarDef[] = [];
    // Access the parse tree via "this"
    for (const statement of this) {
      // Check node type via "instanceof"
      if (!(statement.statement instanceof VarDef)) continue;

      // You have complete access to your custom getters
      if (statement.statement.isExported) {
        exportedVars.push(statement.statement);
      }
    }
    return exportedVars;
  }
}

class Statement extends LangNode.subtype(() => ({
  statement: or(VarDef, VarAssign, CodeBlock),
  separator: optional(token(`Separator`, /;/)),
})) {}

class VarDef extends LangNode.subtype(() => ({
  export: optional(token(`Export`, /export/)),
  modifier: token(`Modifier`, /var|let|const/),
  ident: Ident,
  defOp: AssignOp,
  initValue: or(Ident, LitNum, LitStr),
})) {
  get isExported() {
    return this.export !== null;
  }
  get isConst() {
    return this.modifier.text === "const";
  }
}

class VarAssign extends LangNode.subtype(() => ({
  ident: Ident,
  assignOp: AssignOp,
  value: or(Ident, LitNum, LitStr),
})) {}

class AssignOp extends LangNode.subtype(() => /=/) {}

class Ident extends LangNode.subtype(() => /_*[A-Za-z][A-Za-z0-9_]*/) {}

class LitNum extends LangNode.subtype(() => /-?[0-9]+(\.[0-9]+)?/) {
  get asFloat() {
    return parseFloat(this.text);
  }
}

class LitStr extends LangNode.subtype(() => /"([^"\\]*(\\.[^"\\]*)*)"/) {
  get asString() {
    return this.text.slice(1, -1);
  }
}
class CodeBlock extends LangNode.subtype(() => ({
  openParen: token(`OpenParen`, /\(/),
  statements: many(`StatementList`, Statement),
  closeParen: token(`CloseParen`, /\)/),
})) {}

const testFile = `const myString = "Hello, world!";
let myNumber = 42;
myNumber = 0;`;
const parsed = File.parse(testFile);
console.log(JSON.stringify(parsed, null, 2));
console.log(parsed instanceof File); // true
console.log(parsed instanceof Array); // false
console.log(Array.isArray(parsed)); // true
