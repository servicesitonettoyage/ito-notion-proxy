import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { properties } = req.body;

    const response = await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID,
      },
      properties: properties,
    });

    return res.status(200).json({ success: true, id: response.id });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: error.message || "Notion error",
    });
  }
}
