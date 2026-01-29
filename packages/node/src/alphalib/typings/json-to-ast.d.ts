declare module 'json-to-ast' {
  export interface JsonToAstLocation {
    start: { line: number; column: number }
  }

  export interface ObjectPropertyNode {
    key: { value: string; loc?: JsonToAstLocation }
    value: ValueNode
    loc?: JsonToAstLocation
  }

  export interface LiteralNode {
    type: 'Literal'
    value: unknown
    loc?: JsonToAstLocation
  }

  export interface ArrayNode {
    type: 'Array'
    children: ValueNode[]
    loc?: JsonToAstLocation
  }

  export interface ObjectNode {
    type: 'Object'
    children: ObjectPropertyNode[]
    loc?: JsonToAstLocation
  }

  export type ValueNode = LiteralNode | ArrayNode | ObjectNode

  const parse: (source: string, options?: { loc?: boolean }) => ValueNode
  export default parse
}
