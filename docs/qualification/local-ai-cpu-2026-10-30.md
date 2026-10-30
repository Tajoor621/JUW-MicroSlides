# Live local AI qualification — V6.2.1

30 October 2026. This closes the missing **real local inference** check for a bounded development scenario. It does not qualify a model's scientific accuracy, all topics/counts/modes, browser private-network/CORS permissions or physical hardware/viewer compatibility. Machine-readable calls, model digests and report hashes are in [the result record](local-ai-cpu-2026-10-30.json).

## What ran

Official Ollama **0.40.13**, Linux AMD64 CPU, cloud disabled, loopback-only service, isolated QA model cache. The official release archive SHA-256 matched the publisher's checksum. No Ollama binary/model, backend, account, API key, startup service or paid cloud dependency was added to the product. The temporary test service was stopped by its launcher after each run. The optional repository runner does not install or start a server/model and does not change lecturer settings or saved decks.

The real application engine retrieved online literature, ran an outline call and a writing/selection call, validated exact count and bound source references. No network/model response fixture was used. Each case requested three slides on Bacterial conjugation. The Node-only settings shim supplies test configuration; it is not a browser acceptance test. Runs used a development working tree based on `f8a1964`, not a clean deployed revision; default CI qualifies the final committed software separately.

| Case | Observed result | Meaning |
| --- | --- | --- |
| Original Qwen3 0.6B path | Outline completed; writer hit 55,012 ms timeout; complete three-slide source fallback retained | Inference failure was real. Source fallback worked; AI writing did not pass. |
| Schema/budget/control correction, 0.6B | Two successful responses; rewritten bodies rejected/repeated, two source slides retained | Transport/structured output worked; this model's free writing was not qualified. |
| Schema/budget/control correction, 1.7B | Two successful responses; two source slides retained | More parameters alone did not establish source fidelity or teaching quality. |
| Source-statement selection, 1.7B | Two successful responses, three source-linked slides, **zero rejected-body source fallbacks** | Actual model selections resolved to original, corresponding source statements and bound references. No new model-authored facts were approved. |

The earlier intermediate “completed” free-writing status was insufficient on its own: the repeated instrumentation exposed retained source bodies. The final runner records this distinction. A 200 response, valid JSON or requested count is not evidence that model prose survived grounding.

## Resulting implementation

- Give structured drafting a bounded three-minute request budget in both browser and native bridge; keep cancellation and local-only host/path/size/redirect restrictions.
- Constrain outline/batch counts with JSON schemas. Use only explicitly advertised thinking controls, otherwise preserve the model/server default. This is an extractive selection task, not an independent scientific reviewer.
- For retrieved-source drafting, ask the model to select source-statement IDs. Resolve only IDs from the corresponding slide's trusted passage bank. Reject missing, repeated and wrong-section IDs; do not rewrite the original statement or accept model-supplied citations.
- Preserve legacy free-text compatibility behind the original passage filter. If all model bodies are rejected, label the retained deck as a Knowledge draft rather than imply AI authorship.
- Record filtering/fallback separately in `qa:local-ai`. A tiny CPU model is not a teaching-quality recommendation.

See [the script instructions](../SCRIPTS.md) to repeat against an already installed local model. [Ollama's structured-output documentation](https://docs.ollama.com/capabilities/structured-outputs) and [advertised thinking controls](https://docs.ollama.com/capabilities/thinking) describe the API features used. Reading a matching source passage still does not establish semantic truth, clinical currency or pedagogical adequacy; every export retains the draft label.
