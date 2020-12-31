import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { BucketItemStat, Client } from "minio";
import jwt from "jsonwebtoken";
import mime from "mime-types";

import { transformImage } from "./image";

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
  const { q } = event.queryStringParameters || {};
  let headers: Record<string, boolean | number | string> = {
    "Content-Type": "application/json"
  };
  if (!q) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing query parameter(s)" })
    };
  }
  const { SECRET: secret = "" } = process.env;
  let decode: Record<string, any>;
  try {
    decode = jwt.verify(q, secret) as any;
  } catch (e) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: "Invalid JWT" })
    };
  }
  const { key = "", bucket = "", image = {} } = decode;

  const client = createClient();
  let stat: BucketItemStat;
  try {
    stat = await client.statObject(bucket, key);
  } catch (e) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Invalid bucket or key" })
    };
  }

  const { format } = image;
  const contentType = format ? mime.types[format] : "application/octet-stream";
  const { etag, lastModified } = stat;
  const rs = await client.getObject(bucket, key);
  const buffer = await rs.pipe(transformImage(image)).toBuffer();
  headers = {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=604800",
    ETag: `W/"${etag}"`,
    "Last-Modified": lastModified.toUTCString()
  };
  return {
    statusCode: 200,
    headers,
    body: buffer.toString("base64"),
    isBase64Encoded: true
  };
};
