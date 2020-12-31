import sharp, { Sharp } from "sharp";

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

export const transformImage = (opt: TransformImageOption): Sharp => {
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
