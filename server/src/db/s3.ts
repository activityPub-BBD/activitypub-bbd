import { S3Client } from "@aws-sdk/client-s3";
import { config } from "@config/index.ts";
import { Mutex } from "@utils/index.ts";

const s3Client = new Mutex<S3Client | undefined>(undefined);

export async function connectToS3() {
    return s3Client.with((client) => {
        if (!client) {
            client = new S3Client({ region: config.aws.region });
            console.log("Connected to S3");
        }
        return client;
    });
}

export async function retrieveS3Client() {
    await connectToS3();
    return s3Client.with((client) => client!);
}

export async function disconnectFromS3() {
    return s3Client.with((client) => {
        if (client) {
            client.destroy();
        }
    });
}

