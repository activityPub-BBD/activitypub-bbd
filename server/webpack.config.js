import path from 'path';
import { fileURLToPath } from 'url';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import nodeExternals from 'webpack-node-externals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  target: 'node',
  mode: 'production',

  // Your entry point
  entry: './src/server.ts',

  // Emit as a true ES module
  experiments: {
    outputModule: true,
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'server.js',       // you can also use server.mjs
    module: true,
    library: {
      type: 'module',
    },
  },

  // Treat externals as ESM imports
  externalsType: 'module',
  externals: [
    nodeExternals({
      importType: 'module',
    }),
  ],

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

  stats: {
    errorDetails: true,
  },
};
