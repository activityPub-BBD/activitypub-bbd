import path from 'path';
import { fileURLToPath } from 'url';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import nodeExternals from 'webpack-node-externals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  target: 'node',
  mode: 'production', // or 'development'
  entry: './src/server.ts',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'server.js',
  },
  externals: [nodeExternals()], // Don't bundle node_modules
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.resolve(__dirname, 'tsconfig.json'),
      }),
    ],
  },
  experiments: {
    outputModule: false, // Not needed unless you're outputting ESM
  },
  stats: {
    errorDetails: true,
  },
};
