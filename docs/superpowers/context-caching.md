# Context Caching

Context Caching introduces automated prefix caching in Gemini CLI to minimize
API token costs and reduce response latency during active terminal sessions.
When active, the system prompt and workspace configurations remain cached in
memory on the server.

As conversations grow in length, re-submitting the entire codebase and prompt
configurations consumes extensive API resources. Context Caching ensures static
elements remain cached, leading to up to 90% savings in token costs.

---

## How It Works

The caching system operates seamlessly in the background during your terminal
sessions.

1. **Threshold Assessment:** When you send a prompt, Gemini CLI calculates the
   total token size of the static system instructions, custom Athanor configs,
   and static workflows.
2. **Cache Creation:** If the static prompt length exceeds the threshold of
   32,768 tokens, the core engine registers a new Context Cache with the Gemini
   API.
3. **Session Reuse:** For subsequent turns, the engine automatically attaches
   the unique Cache ID to the request, avoiding the need to re-transmit the
   entire static block.
4. **Time-to-Live Extension:** Each cache hit automatically extends the active
   TTL (Time-To-Live, defaulting to 5 minutes) of the cache.

---

## Configuration

You can customize the caching behavior using environment variables.

To customize the cache location or force caching behavior, set these variables:

- **`VESTA_ATHANOR_DIR`**: Custom path to search for Athanor soul files (falls
  back to `/home/thoor/agora/familia/vesta/athanor`).
- **`VESTA_FORCE_CACHING`**: Set to `true` to force caching even on smaller
  prompts for local testing and validation.
