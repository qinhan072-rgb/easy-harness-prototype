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
- It now explicitly treats keywords as evidence only, not workflow triggers.
- It also defines the evidence boundary: attachment metadata is not the same as
  visual/OCR/document understanding.

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

Important boundary:

```text
Model choice is secondary to the Agent contract.
```

DeepSeek, Qwen, OpenAI, or another model can sit behind the same contract. The
platform should not depend on a keyword script or a provider-specific prompt.
For multimodal work, add an attachment-observation layer first, then feed those
observations into the Draft Agent.
