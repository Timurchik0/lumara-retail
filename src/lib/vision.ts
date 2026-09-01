import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";

export type PhotoAnalysis = {
  name: string;
  category: string;
  description: string;
};

const CATEGORIES = [
  "Туфли",
  "Босоножки",
  "Кроссовки",
  "Ботинки",
  "Сапоги",
  "Балетки",
  "Другое",
];

/**
 * Анализ фото модели обуви через Claude Vision — та же идея, что AI Field в Airtable-версии.
 * Принимает сырые байты файла в любом формате (телефоны и браузеры часто врут в MIME-типе
 * или присылают HEIC/WEBP под видом .jpg) и всегда перекодирует в честный JPEG через sharp
 * перед отправкой — так и Claude не откажет с "image format not supported".
 */
export async function analyzeShoePhoto(
  rawImage: Buffer,
): Promise<PhotoAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const jpegBuffer = await sharp(rawImage)
    .rotate()
    .resize(1568, 1568, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  const imageBase64 = jpegBuffer.toString("base64");

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `Проанализируй фото женской обуви для оптового склада. Определи:
- name: короткое название на русском (например "Туфли на каблуке бежевые")
- category: одна из строго: ${CATEGORIES.join(", ")}
- description: материал/особенности одним предложением, по-деловому, без маркетингового тона

Ответь строго в формате JSON без пояснений: {"name": "...", "category": "...", "description": "..."}`,
          },
        ],
      },
    ],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    return {
      name: String(parsed.name ?? ""),
      category: String(parsed.category ?? ""),
      description: String(parsed.description ?? ""),
    };
  } catch {
    return null;
  }
}
