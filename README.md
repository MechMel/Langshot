# Langshot

We found a slick way to make strongly typed parsers in TypeScript, and are building a language extension framework around it. Very much a work in progress.

### Getting Started

Let's build a super simple parser to parse the following JavaScript snippet:

```js
const myString = "Hello, world!";
let myNumber = 42;
myNumber = 0;
```

We can define a parser for this like so:

```ts
import { AstNode, token, and, or, optional, many } from "./Langshot";

class File extends AstNode.from(() => ({
  statements: many(Statement),
})) {
  // You can put whatever you want in here and access the parsed tree via "this"
  get lineCount() {
    return this.statements.length;
  }
}

class Statement extends AstNode.from(() => ({
  statement: or([VarDef, VarAssign]),
  separator: optional(token(`Separator`, /;/)),
})) {}

class VarDef extends AstNode.from(() => ({
  modifier: token(`Modifier`, /var|let|const/),
  ident: Ident,
  defOp: AssignOp,
  initValue: or([Ident, LitNum, LitStr]),
})) {
  get isConst() {
    return this.modifier.text === "const";
  }
}

class VarAssign extends AstNode.from(() => ({
  ident: Ident,
  assignOp: AssignOp,
  value: or([Ident, LitNum, LitStr]),
})) {}

class AssignOp extends AstNode.from(() => /=/) {}

class Ident extends AstNode.from(() => /_*[A-Za-z][A-Za-z0-9_]*/) {}

class LitNum extends AstNode.from(() => /-?[0-9]+(\.[0-9]+)?/) {
  get asFloat() {
    return parseFloat(this.text);
  }
}

class LitStr extends AstNode.from(() => /"([^"\\]*(\\.[^"\\]*)*)"/) {
  get asString() {
    return this.text.slice(1, -1);
  }
}
```

If we parse the snippet above using `File.parse(testFile)`, which yields the following AST:

```txt
{
  "nodeType": "File",
  "startIndex": 0,
  "endIndex": 66,
  "statements": [
    {
      "nodeType": "Statement",
      "startIndex": 0,
      "endIndex": 33,
      "statement": {
        "nodeType": "VarDef",
        "startIndex": 0,
        "endIndex": 32,
        "modifier": {
          "nodeType": "Modifier",
          "startIndex": 0,
          "endIndex": 5,
          "text": "const"
        },
        "ident": {
          "nodeType": "Ident",
          "startIndex": 6,
          "endIndex": 14,
          "text": "myString"
        },
        "defOp": {
          "nodeType": "AssignOp",
          "startIndex": 15,
          "endIndex": 16,
          "text": "="
        },
        "initValue": {
          "nodeType": "LitStr",
          "startIndex": 17,
          "endIndex": 32,
          "text": "\"Hello, world!\""
        }
      },
      "separator": {
        "nodeType": "Separator",
        "startIndex": 32,
        "endIndex": 33,
        "text": ";"
      }
    },
    {
      "nodeType": "Statement",
      "startIndex": 34,
      "endIndex": 52,
      "statement": {
        "nodeType": "VarDef",
        "startIndex": 34,
        "endIndex": 51,
        "modifier": {
          "nodeType": "Modifier",
          "startIndex": 34,
          "endIndex": 37,
          "text": "let"
        },
        "ident": {
          "nodeType": "Ident",
          "startIndex": 38,
          "endIndex": 46,
          "text": "myNumber"
        },
        "defOp": {
          "nodeType": "AssignOp",
          "startIndex": 47,
          "endIndex": 48,
          "text": "="
        },
        "initValue": {
          "nodeType": "LitNum",
          "startIndex": 49,
          "endIndex": 51,
          "text": "42"
        }
      },
      "separator": {
        "nodeType": "Separator",
        "startIndex": 51,
        "endIndex": 52,
        "text": ";"
      }
    },
    {
      "nodeType": "Statement",
      "startIndex": 53,
      "endIndex": 66,
      "statement": {
        "nodeType": "VarAssign",
        "startIndex": 53,
        "endIndex": 65,
        "ident": {
          "nodeType": "Ident",
          "startIndex": 53,
          "endIndex": 61,
          "text": "myNumber"
        },
        "assignOp": {
          "nodeType": "AssignOp",
          "startIndex": 62,
          "endIndex": 63,
          "text": "="
        },
        "value": {
          "nodeType": "LitNum",
          "startIndex": 64,
          "endIndex": 65,
          "text": "0"
        }
      },
      "separator": {
        "nodeType": "Separator",
        "startIndex": 65,
        "endIndex": 66,
        "text": ";"
      }
    }
  ]
}
```

### Caveats

We have big dreams for Langshot, but right now it's really small and has a lot of limitations.

- Only parsing works right now.
- There is no elegant system for comments yet.
- There is no elegant parser logging system yet.
- There is no elegant system to handle code actively being typed.
