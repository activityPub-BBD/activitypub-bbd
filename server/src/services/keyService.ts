import { getLogger } from "@logtape/logtape";
import { UserService } from "./userService.ts";
import { registerModels } from "@models/index.ts";
import { config } from "@config/index.ts";
import { retrieveDb } from "@db/index.ts";
import { exportJwk, generateCryptoKeyPair, importJwk } from "@fedify/fedify";

const logger = getLogger("fedify");

const db = await retrieveDb(config.dbName);         
const { KeyPair: KeyPairModel } = registerModels(db);

async function getOrCreateKeyPairs(identifier: string): Promise<CryptoKeyPair[]> {
  const user = await UserService.getUserByUsername(identifier);
  if (!user) return [];

  const rows = await KeyPairModel.find({ userId: user._id });
  // Each document represents one key pair (e.g., either an RSASSA-PKCS1-v1_5 or Ed25519 pair).
  const keys = Object.fromEntries(
    rows.map((row) => [row.type, row])
  )

  const pairs: CryptoKeyPair[] = [];

  for (const keyType of ["RSASSA-PKCS1-v1_5", "Ed25519"] as const) {
    if (!keys[keyType]) {
      logger.debug(
        "The user {identifier} does not have a {keyType} key; creating one...",
        { identifier, keyType },
      );

      const { privateKey, publicKey } = await generateCryptoKeyPair(keyType);
      logger.debug("The keys were CREATED")

      try {
            await KeyPairModel.create({
                userId: user._id,
                type: keyType,
                privateKey: JSON.stringify(await exportJwk(privateKey)),
                publicKey: JSON.stringify(await exportJwk(publicKey)),
            });
        } catch (err) {
            logger.error(`Failed to create key pair: ${err instanceof Error ? err.message : err}`)
        }

      pairs.push({ privateKey, publicKey });
    } else {
      pairs.push({
        privateKey: await importJwk(
          JSON.parse(keys[keyType].privateKey),
          "private"
        ),
        publicKey: await importJwk(
          JSON.parse(keys[keyType].publicKey),
          "public"
        ),
      });
    }
  }
  return pairs;
}


export const KeyService = {
    getOrCreateKeyPairs
}
