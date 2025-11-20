const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/load-test.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'load-test.js',
    libraryTarget: 'commonjs',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  target: 'web',
  externals: [
    /^k6(\/.*)?$/,
  ],
  stats: {
    colors: true,
  },
  optimization: {
    minimize: false,
  },
};
