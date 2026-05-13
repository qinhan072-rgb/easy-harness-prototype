# AI Agent Notes

`AI_AGENT_PRINCIPLES.md` is a good product baseline for the current stage.

My evaluation:

- It correctly defines the Agent as a requirement transformer, not a general
  chatbot.
- It correctly limits the current target to Easy Harness Draft closure, not
  factory-ready BOM or automatic quotation.
- It protects user experience by avoiding long industrial questionnaires.
- It matches the current platform strategy: collect natural input, structure it,
  mark unknowns, and move the request into Easy Harness review when enough is
  known.
- It also prevents a common failure mode: forcing users to provide connector,
  terminal, material, and test details they may not know.

Implementation implication:

```text
User input + uploaded material metadata
  -> AI intake
  -> Easy Harness Draft
  -> concise missing-info prompt only if truly blocking
  -> Easy Harness review / quote-path evaluation
```

The next AI work should improve Draft quality and judgment boundaries before
building a larger file-parsing or production-data pipeline.
