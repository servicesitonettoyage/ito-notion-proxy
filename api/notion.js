import { Client } from "@notionhq/client";
import { google } from "googleapis";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Parse Google Service Account JSON
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({
  version: "v3",
  auth,
});

export default async function handler(req, res) {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {

    const { properties, photos_avant, photos_apres } = req.body;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // 🔹 Function to upload image to Drive
    async function uploadToDrive(file) {

      const buffer = Buffer.from(
        file.data.replace(/^data:.+;base64,/, ""),
        "base64"
      );

      const response = await drive.files.create({
        requestBody: {
          name: file.name,
          parents: [folderId],
        },
        media: {
          mimeType: file.type,
          body: buffer,
        },
      });

      const fileId = response.data.id;

      // Make file public
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      return `https://drive.google.com/file/d/${fileId}/view`;
    }

    // 🔹 Upload photos
    let linksAvant = [];
    let linksApres = [];

    if (photos_avant && photos_avant.length > 0) {
      for (const file of photos_avant) {
        const link = await uploadToDrive(file);
        linksAvant.push(link);
      }
    }

    if (photos_apres && photos_apres.length > 0) {
      for (const file of photos_apres) {
        const link = await uploadToDrive(file);
        linksApres.push(link);
      }
    }

    // 🔹 Add Drive links to Notion properties
    if (linksAvant.length > 0) {
      properties["Fotos Antes"] = {
        rich_text: [
          {
            text: {
              content: linksAvant.join("\n"),
            },
          },
        ],
      };
    }

    if (linksApres.length > 0) {
      properties["Fotos Después"] = {
        rich_text: [
          {
            text: {
              content: linksApres.join("\n"),
            },
          },
        ],
      };
    }

    // 🔹 Create Notion page
    const response = await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID,
      },
      properties,
    });

    return res.status(200).json({
      success: true,
      id: response.id,
    });

  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({
      message: error.message || "Server error",
    });
  }
}
