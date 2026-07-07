# Bullshit Diagram DSL — Reference & AI Prompt Guide

This document describes the custom diagram DSL parsed by the `bullshit` VS Code
extension, and gives ready-to-use prompts for instructing an AI assistant to
generate valid diagram source in this syntax.

The extension renders `.md` (or any text file) content as a live, draggable
node-and-edge diagram in a side panel (command: `Diagram: Open Preview`).
No external services (no Mermaid, no PlantUML) — parsing and layout (dagre)
happen locally inside the extension.

---

## 1. Syntax Reference

| Token | Meaning |
|---|---|
| `[ID]` | Declares/activates a flow block (node) with the given id. All content until the next `[ID]` belongs to this node. |
| `- text` | A field (line of content) belonging to the currently active block. |
| `- title` followed by indented `- item` lines | A field that becomes a list: the parent line is the field title, indented children are its items. |
| `(ID)` | On its own line inside a block: declares a directed edge `ID -> currentBlock`. |
| `{text}` | A label for the edge. Can follow `(ID)` on the same line, or appear on its own line right after it. |
| `# text` | Full-line comment. Ignored by the parser. |
| `\x` | Escapes a reserved character (`# ( ) [ ] { } \`) so it renders literally inside text. |

### Additional inline rules (usable inside any `- text` line, not just standalone)

- `(ID)` inline in a text line also creates an incoming edge `ID -> currentBlock`.
- `[ID]` inline in a text line creates an outgoing edge `currentBlock -> ID`.
- `{text}` inline attaches as a label to whichever inline edge immediately precedes it.
- Duplicate edges between the same two ids are automatically merged (first
  non-empty label wins), so you don't need to worry about declaring the same
  connection twice from both sides.

### Indentation rules

- Indentation is what distinguishes a **new field** from a **child item** of
  the previous field. Use 2 spaces per nesting level.
- A field with no indented children under it is rendered as a plain line, not
  a bulleted list.
- The **first field** of a node becomes its header/title in the rendered box;
  everything after that renders in the node body.

---

## 2. Minimal valid example

```
[Start]
- Entry point
- Validates input

[End]
(Start) {on success}
- Returns response
```

This produces two boxes ("Start", "End") connected by one labeled arrow.

---

## 3. Full example (flowchart with an error branch)

```
# Core system orchestration diagram
[A1]
- System Initialization
- Prerequisite Checks
  - Verify node environment version > 18
  - Check background system memory allocations

[A2]
(A1) {Routes traffic here upon successful validation}
- Authentication Pipeline
- Credential Inputs
  - Read username text field
  - Hash incoming password payload
  - Issue JSON Web Token \#200

[E1]
(A1) {Routes traffic here if prerequisites fail}
- Global Exception Management
- Error Escalation Routine
  - Log failure state to persistent telemetry
  - Display visual toast error layout
```

---

## 4. Rules an AI generator MUST follow

1. Every node referenced by an edge (`(ID)` or inline `[ID]`) must also be
   declared with its own `[ID]` block somewhere in the file — otherwise the
   edge is silently dropped (both endpoints must exist).
2. Node ids are free text but must be unique per diagram. Keep them short
   (e.g. `A1`, `Auth`, `DB`) — they are not shown as the node title, only used
   for wiring edges.
3. The **first `- ` line** under `[ID]` is the node's visible title — make it
   short and descriptive (this is what appears in the box header).
4. Use 2-space indentation consistently for child items; do not mix tabs and
   spaces.
5. Keep edge labels short (they're rendered as small pills on the arrow) —
   aim for under 6 words.
6. Escape any literal `#`, `(`, `)`, `[`, `]`, `{`, `}` that should appear in
   node text with a backslash, e.g. `Issue token \#200`.
7. Comments (`# ...`) are only for the source file — they never appear in the
   rendered diagram.

---

## 5. Ready-to-use AI prompts

### Prompt A — generate a new diagram from a description

```
You are generating diagram source for a custom VS Code extension DSL.
Follow this grammar exactly:

- [ID] declares a node. Everything after it (until the next [ID]) belongs to it.
- "- text" is a field/line of the active node. Indent with 2 spaces to add
  child items under the previous field (making it a list).
- "(ID)" on its own line inside a node declares an edge ID -> this node.
  Optionally followed by "{label text}" on the same or next line.
- Inline in any "- text" line: "(ID)" = incoming edge, "[ID]" = outgoing edge,
  "{label}" = label for the inline edge right before it.
- "# text" is a comment, ignored by the parser.
- Escape reserved characters with backslash: \# \( \) \[ \] \{ \}
- The first "- " line under each [ID] becomes that node's visible title.
- Every node used in an edge must have its own [ID] block declared somewhere.

Task: [DESCRIBE THE SYSTEM / PROCESS / ARCHITECTURE HERE]

Output ONLY the diagram source, no explanations, no markdown code fences.
```

### Prompt B — convert existing prose/architecture notes into the DSL

```
Convert the following description into the custom flow DSL below. Identify
the distinct components as [ID] blocks, their key facts as "- text" fields,
and the relationships between them as (ID) edges with short {label} text
describing the connection/trigger. Keep node ids short and unique.

Grammar:
[ID] / - text / - title with indented - items / (ID) {label} / # comment / \escape

Description to convert:
"""
[PASTE PROSE HERE]
"""

Output ONLY the diagram source.
```

### Prompt C — extend/modify an existing diagram

```
Here is an existing diagram in a custom DSL (grammar: [ID] blocks, "- text"
fields with 2-space indented child items, "(ID) {label}" edges, "#" comments,
backslash escapes). Modify it per the instructions below, preserving all
node ids and edges that aren't explicitly changed.

Current diagram:
"""
[PASTE CURRENT .md CONTENT HERE]
"""

Instructions: [DESCRIBE THE CHANGE, e.g. "add a caching layer node between
API and DB, route API's failed-cache-lookup case to DB directly"]

Output the FULL updated diagram source, not just the diff.
```

---

## 6. How to view the result

1. In VS Code, run command **`Diagram: Open Preview`** (`Ctrl+Shift+P`).
2. Open or paste the generated DSL into any text file and save it.
3. The panel re-renders automatically on save/edit of the active file.
4. Drag node headers to reposition, scroll wheel to zoom, drag empty canvas
   to pan.
