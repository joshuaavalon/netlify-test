import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import sharp, { Sharp } from "sharp";
import { BucketItemStat, Client } from "minio";
import jwt from "jsonwebtoken";
import mime from "mime-types";

const createClient = (): Client => {
  const {
    S3_SECRET_KEY: secretKey = "",
    S3_ENDPOINT: endPoint = "",
    S3_ACCESS_KEY: accessKey = "",
    S3_REGION: region = ""
  } = process.env;
  return new Client({ endPoint, secretKey, accessKey, region });
};

const allowMethods = [
  "resize",
  "extend",
  "extract",
  "trim",
  "rotate",
  "flip",
  "flop",
  "sharpen",
  "median",
  "blur",
  "flatten",
  "gamma",
  "negate",
  "normalise",
  "normalize",
  "convolve",
  "threshold",
  "linear",
  "recomb",
  "modulate",
  "tint",
  "greyscale",
  "grayscale",
  "toColourspace",
  "toColorspace",
  "removeAlpha",
  "ensureAlpha",
  "extractChannel"
];

interface TransformImageOption {
  format: string;
  query: Record<string, any>;
}

const transformImage = (opt: TransformImageOption): Sharp => {
  let shp = sharp();
  const { format: ext, query } = opt;
  const { format = {}, ...others } = query;
  Object.entries(others).forEach(([key, value]) => {
    if (
      allowMethods.includes(key) &&
      key in shp &&
      typeof shp[key] === "function"
    ) {
      shp = shp[key](value);
    }
  });
  return shp.toFormat(ext, format);
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
