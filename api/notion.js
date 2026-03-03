import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export default async function handler(req, res) {

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { properties, photos_avant, photos_apres } = req.body;

    // 1️⃣ Crear página
    const page = await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID,
      },
      properties,
    });

    // 2️⃣ Agregar bloque título sección fotos
    const children = [];

    if (photos_avant?.length > 0) {
      children.push({
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "Photos Avant" } }],
        },
      });

      photos_avant.forEach(photo => {
        children.push({
          object: "block",
          type: "image",
          image: {
            type: "external",
            external: {
              url: photo.data, // ⚠️ SOLO si es URL pública
            },
          },
        });
      });
    }

    if (photos_apres?.length > 0) {
      children.push({
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "Photos Après" } }],
        },
      });

      photos_apres.forEach(photo => {
        children.push({
          object: "block",
          type: "image",
          image: {
            type: "external",
            external: {
              url: photo.data,
            },
          },
        });
      });
    }

    if (children.length > 0) {
      await notion.blocks.children.append({
        block_id: page.id,
        children,
      });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: error.message || "Notion error",
    });
  }
}
