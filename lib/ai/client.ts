import "server-only";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = "google/gemini-2.5-flash";

export async function askAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://chrona.app",
      "X-Title": "Chrona V1",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 512,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}
