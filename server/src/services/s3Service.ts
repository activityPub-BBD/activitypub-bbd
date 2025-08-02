import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "@config/config.ts";
import { retrieveS3Client } from "@db/s3.ts";
import { v4 as uuidv4 } from "uuid";

export const uploadImageToS3 = async (
  file: Buffer,
  mimeType: string,
  userId: string
): Promise<string> => {
  // Validate file type
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
  ];
  if (!allowedTypes.includes(mimeType)) {
    throw new Error(
      `Invalid file type: ${mimeType}. Allowed types: ${allowedTypes.join(
        ", "
      )}`
    );
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.length > maxSize) {
    throw new Error(
      `File too large: ${file.length} bytes. Maximum allowed: ${maxSize} bytes`
    );
  }

  // Generate unique filename
  const fileExtension = getFileExtension(mimeType);
  const fileName = `${userId}/${uuidv4()}.${fileExtension}`;

  try {
    const command = new PutObjectCommand({
      Bucket: config.aws.s3MediaBucket,
      Key: fileName,
      Body: file,
      ContentType: mimeType,
      CacheControl: "max-age=31536000", // 1 year
      Metadata: {
        userId: userId,
        uploadDate: new Date().toISOString(),
      },
    });

    const client = await retrieveS3Client();
    await client.send(command);

    const url = `https://${config.aws.s3MediaBucket}.s3.${config.aws.region}.amazonaws.com/${fileName}`;

    return url;
  } catch (error) {
    console.error("S3 upload error:", error);
    throw new Error("Failed to upload file to S3");
  }
};

const getFileExtension = (mimeType: string): string => {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };

  return extensions[mimeType] || "bin";
};
