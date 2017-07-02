import { join } from 'path';

const rules = [{
  test: /\.js$/,
  loader: 'babel-loader',
  include: join(__dirname, 'src'),
  query: {
    presets: [
      ['es2015', { modules: false }],
      'stage-0',
    ],
    plugins: [
      'transform-decorators-legacy',
      'transform-class-properties',
      'add-module-exports',
      // 'lodash',
    ],
  },
}, {
  test: /\.json$/,
  loader: 'json-loader',
}];

export default {
  devtool: 'source-map',
  entry: './src/index',
  output: {
    path: join(__dirname, 'umd'),
    library: 'MobxReactForm',
    libraryTarget: 'umd',
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.json'],
  },
  externals: {
    mobx: 'mobx',
  },
  module: { rules },
};
