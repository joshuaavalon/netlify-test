import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import sharp from "sharp";
import { Client } from "minio";

const createClient = (): Client => {
  const {
    S3_SECRET_KEY: secretKey = "",
    S3_ENDPOINT: endPoint = "",
    S3_ACCESS_KEY: accessKey = "",
    S3_REGION: region = ""
  } = process.env;
  return new Client({ endPoint, secretKey, accessKey, region });
};

export const handler: APIGatewayProxyHandlerV2 = async event => {
  const { key = "", bucket = "" } = event.queryStringParameters || {};
  const client = createClient();
  try {
    client.statObject(bucket, key);
  } catch (e) {
    return { statusCode: 404 };
  }
  const rs = await client.getObject(bucket, key);
  const filter = sharp().png();
  const buffer = await rs.pipe(filter).toBuffer();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "image/png"
    },
    body: buffer.toString("base64"),
    isBase64Encoded: true
  };
};
