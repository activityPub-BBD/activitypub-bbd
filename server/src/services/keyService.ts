import { config } from "@config/index";
import { retrieveDb } from "@db/index";
import { registerModels, type IKey } from "@models/index";
import { generateCryptoKeyPair, exportJwk, importJwk } from "@fedify/fedify";

interface CryptoKeyPair {
  privateKey: any;
  publicKey: any;
}
import { getLogger } from "@logtape/logtape";

const logger = getLogger("server");

const db = await retrieveDb(config.dbName);
const { Key: KeyModel } = registerModels(db);

const getKeysByUserId = async (userId: string): Promise<IKey[]> => {
    return await KeyModel.find({ userId });
};

const getKeyByUserIdAndType = async (userId: string, type: string): Promise<IKey | null> => {
    return await KeyModel.findOne({ userId, type });
};

const createKey = async (userId: string, type: string, privateKey: string, publicKey: string): Promise<IKey> => {
    return await KeyModel.create({
        userId,
        type,
        privateKey,
        publicKey
    });
};

const generateAndStoreKeyPair = async (userId: string, keyType: "RSASSA-PKCS1-v1_5" | "Ed25519"): Promise<CryptoKeyPair> => {
    logger.debug(`Generating ${keyType} key pair for user ${userId}`);
    
    const { privateKey, publicKey } = await generateCryptoKeyPair(keyType);
    
    await createKey(
        userId,
        keyType,
        JSON.stringify(await exportJwk(privateKey)),
        JSON.stringify(await exportJwk(publicKey))
    );
    
    return { privateKey, publicKey };
};

const getKeyPairsForUser = async (userId: string): Promise<CryptoKeyPair[]> => {
    const keys = await getKeysByUserId(userId);
    const keyMap = Object.fromEntries(
        keys.map((key) => [key.type, key])
    ) as Record<string, IKey>;
    
    const pairs: CryptoKeyPair[] = [];
    
    // For each of the two key formats that the actor supports, check if they have a key pair
    for (const keyType of ["RSASSA-PKCS1-v1_5", "Ed25519"] as const) {
        if (keyMap[keyType] == null) {
            logger.debug(`User ${userId} does not have ${keyType} key; creating one...`);
            const pair = await generateAndStoreKeyPair(userId, keyType);
            pairs.push(pair);
        } else {
            logger.debug(`User ${userId} does have ${keyType} key`);
            
            pairs.push({
                privateKey: await importJwk(
                    JSON.parse(keyMap[keyType].privateKey),
                    "private"
                ),
                publicKey: await importJwk(
                    JSON.parse(keyMap[keyType].publicKey),
                    "public"
                ),
            });
        }
    }
     logger.debug(pairs)
    return pairs;
};

export const KeyService = {
    getKeysByUserId,
    getKeyByUserIdAndType,
    createKey,
    generateAndStoreKeyPair,
    getKeyPairsForUser
}; 