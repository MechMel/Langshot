import { LangNode, token, and, or, optional, many } from "./Langshot";

class File extends LangNode.from(() => ({
  statements: many(`StatementList`, Statement),
})) {
  // Add whatever getters, setters, and methods you want
  get exports() {
    const exportedVars: VarDef[] = [];
    // Access the parse tree via "this"
    for (const statement of this.statements) {
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

class Statement extends LangNode.from(() => ({
  statement: or(VarDef, VarAssign, CodeBlock),
  separator: optional(token(`Separator`, /;/)),
})) {}

class VarDef extends LangNode.from(() => ({
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

class VarAssign extends LangNode.from(() => ({
  ident: Ident,
  assignOp: AssignOp,
  value: or(Ident, LitNum, LitStr),
})) {}

class AssignOp extends LangNode.from(() => /=/) {}

class Ident extends LangNode.from(() => /_*[A-Za-z][A-Za-z0-9_]*/) {}

class LitNum extends LangNode.from(() => /-?[0-9]+(\.[0-9]+)?/) {
  get asFloat() {
    return parseFloat(this.text);
  }
}

class LitStr extends LangNode.from(() => /"([^"\\]*(\\.[^"\\]*)*)"/) {
  get asString() {
    return this.text.slice(1, -1);
  }
}
class CodeBlock extends LangNode.from(() => ({
  openParen: token(`OpenParen`, /\(/),
  statements: many(`StatementList`, Statement),
  closeParen: token(`CloseParen`, /\)/),
})) {}

const testFile = `const myString = "Hello, world!";
let myNumber = 42;
myNumber = 0;`;
console.log(JSON.stringify(File.parse(testFile), null, 2));
