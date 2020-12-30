const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

const nodeEnv = process.env.NODE_ENV || "production";

module.exports = {
  entry: {
    index: path.join(__dirname, "src", "index")
  },
  mode: nodeEnv,
  resolve: {
    extensions: [".wasm", ".mjs", ".js", ".json", ".ts"],
    mainFields: ["module", "main"]
  },
  module: {
    rules: [
      {
        test: /\.(m?js|ts)?$/u,
        use: {
          loader: "babel-loader",
          options: {
            cacheDirectory: true,
            babelrc: true
          }
        }
      }
    ]
  },
  context: __dirname,
  target: "node",
  plugins: [new CleanWebpackPlugin()],
  output: {
    path: path.join(__dirname, "lambda"),
    filename: "[name].js",
    libraryTarget: "commonjs"
  },
  optimization: {
    nodeEnv,
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false
          }
        },
        extractComments: false
      })
    ]
  },
  bail: true,
  devtool: false,
  stats: {
    colors: true
  },
  externals: {
    sharp: "commonjs sharp"
  }
};
