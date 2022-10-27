import path from 'path';

export const START_LANGUAGE = [
  'ar',
  'zh-CN',
  'zh-TW',
  'en',
  'de',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pt',
  'ru',
  'es',
  'th',
  'tr',
  'vi',
];
export const LANGUAGE = [
  { name: 'ar_EG', value: 'ar' },
  { name: 'zh_CN', value: 'zh-CN' },
  { name: 'zh_TW', value: 'zh-TW' },
  { name: 'en_US', value: 'en' },
  { name: 'de_DE', value: 'de' },
  { name: 'hi_IN', value: 'hi' },
  { name: 'id_ID', value: 'id' },
  { name: 'it_IT', value: 'it' },
  { name: 'ja_JP', value: 'ja' },
  { name: 'ko_KR', value: 'ko' },
  { name: 'ms_MY', value: 'ms' },
  { name: 'pt_PT', value: 'pt' },
  { name: 'ru_RU', value: 'ru' },
  { name: 'es_ES', value: 'es' },
  { name: 'th_TH', value: 'th' },
  { name: 'tr_TR', value: 'tr' },
  { name: 'vi_VN', value: 'vi' },
];

export const API_KEY = path.resolve(__dirname, './config/credentials.json');
export const SKIN_DIR = path.resolve(__dirname, './skins');
export const EN_JSON = '/en_US.json';
