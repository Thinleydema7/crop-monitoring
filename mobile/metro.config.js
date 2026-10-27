const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../shared')];
config.resolver.assetExts = [...config.resolver.assetExts, 'tflite'];
module.exports = config;
