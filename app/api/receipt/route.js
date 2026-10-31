import { createClient } from "@supabase/supabase-js";

const MODEL = "gemini-3.5-flash-lite";

const PROMPT = `이 이미지는 영수증이다. 아래 값을 읽어라. 확실하지 않거나 보이지 않으면 해당 값은 null로 둔다. 추측하지 마라.
- amount: 고객이 최종 결제한 합계 금액(원, 정수). 부가세, 공급가액, 받은 돈(현금 수령액), 거스름돈, 할인 전 금액은 제외한다.
- date: 결제 날짜 (YYYY-MM-DD)
- place: 상호명(사용처)`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    amount: { type: "INTEGER", nullable: true },
    date: { type: "STRING", nullable: true },
    place: { type: "STRING", nullable: true },
  },
  required: ["amount", "date", "place"],
};

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith("여기에")) {
    return Response.json({ error: "GEMINI_API_KEY가 설정되지 않았어요." }, { status: 500 });
  }

  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  const { data: auth } = token ? await supabase.auth.getUser(token) : { data: null };
  if (!auth?.user) {
    return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { image, mimeType } = await request.json();
  if (!image) {
    return Response.json({ error: "이미지가 없어요." }, { status: 400 });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          { parts: [{ inlineData: { mimeType: mimeType || "image/jpeg", data: image } }, { text: PROMPT }] },
        ],
        generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0 },
      }),
    }
  );

  if (!res.ok) {
    return Response.json({ error: "영수증을 읽는 데 실패했어요." }, { status: 502 });
  }

  try {
    const body = await res.json();
    const parsed = JSON.parse(body.candidates[0].content.parts[0].text);
    const amount = Number.isInteger(parsed.amount) && parsed.amount > 0 ? parsed.amount : null;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(parsed.date ?? "") ? parsed.date : null;
    const place = parsed.place?.trim() || null;
    return Response.json({ amount, date, place });
  } catch {
    return Response.json({ error: "영수증을 읽는 데 실패했어요." }, { status: 502 });
  }
}
