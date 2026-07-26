const DEFAULT_SPACE_URL = "https://abhifdsdf-qwen-cuad-raft.hf.space";
const DEFAULT_API_NAME = "predict";

type CallResponse = { event_id?: string; detail?: string };

export async function POST(req: Request) {
  let question: string;
  let context: string;
  try {
    const body = await req.json();
    question = String(body.question ?? "").trim();
    context = String(body.context ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!question) {
    return Response.json({ error: "A question is required." }, { status: 400 });
  }

  const spaceUrl = (process.env.GRADIO_SPACE_URL || DEFAULT_SPACE_URL).replace(/\/$/, "");
  const apiName = process.env.GRADIO_API_NAME || DEFAULT_API_NAME;

  try {
    // Step 1: queue the prediction. Current Gradio Spaces expose a two-step
    // call/event_id + server-sent-events protocol (this replaced the old
    // single-shot /api/predict and /run/predict endpoints).
    const callRes = await fetch(`${spaceUrl}/gradio_api/call/${apiName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [question, context] }),
    });

    if (!callRes.ok) {
      const detail = await callRes.text().catch(() => "");
      return Response.json(
        { error: `The inference Space returned ${callRes.status}. ${detail.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const callJson = (await callRes.json()) as CallResponse;
    const eventId = callJson.event_id;
    if (!eventId) {
      return Response.json({ error: "The Space did not return an event id." }, { status: 502 });
    }

    // Step 2: stream the result via SSE and read the "complete" event.
    const streamRes = await fetch(`${spaceUrl}/gradio_api/call/${apiName}/${eventId}`, {
      headers: { Accept: "text/event-stream" },
    });

    if (!streamRes.ok || !streamRes.body) {
      return Response.json({ error: "Could not open the result stream." }, { status: 502 });
    }

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventType = "";
    let result: unknown = null;
    let errorPayload: string | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          const payload = line.slice(5).trim();
          if (eventType === "complete") {
            try {
              result = JSON.parse(payload);
            } catch {
              result = payload;
            }
          } else if (eventType === "error") {
            errorPayload = payload;
          }
        }
      }
      if (result !== null || errorPayload !== null) break;
    }

    if (errorPayload) {
      return Response.json({ error: `Space error: ${errorPayload}` }, { status: 502 });
    }
    if (result === null) {
      return Response.json(
        { error: "No response from the Space — if it's a free-tier Space it may be asleep; try again in ~30s." },
        { status: 504 }
      );
    }

    const answer = Array.isArray(result) ? result[0] : result;
    return Response.json({ answer });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error calling the inference Space." },
      { status: 500 }
    );
  }
}
