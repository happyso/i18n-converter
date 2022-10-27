import fs from 'fs';
import { Select, MultiSelect } from 'enquirer';
import { SKIN_DIR, LANGUAGE, START_LANGUAGE } from './const';

export const checkNewSkin = () => {
  const result = [];
  console.log('skins 폴더 체크 시작');
  const folders = fs.readdirSync(SKIN_DIR);
  folders.forEach((folder) => {
    const files = fs.readdirSync(`${SKIN_DIR}/${folder}`);
    if (files.length <= 1 && files.includes('default')) {
      result.push(folder);
    }
  });

  if (!result.length) {
    throw new Error('새롭게 생성된 스킨 폴더가 없습니다.');
  }

  return result;
};

export const prompt = async (choicesSkin) => {
  const targetDirPrompt = new Select({
    name: 'targetDir',
    message: '빌드할 폴더를 선택해주세요.',
    choices: choicesSkin,
  });
  const targetDir = await targetDirPrompt.run();

  const sourceLanguagePrompt = new Select({
    name: 'sourceLanguage',
    message: '시작어를 선택해주세요.',
    choices: START_LANGUAGE,
  });
  const sourceLanguage = await sourceLanguagePrompt.run();

  if (!sourceLanguage.length) {
    throw new Error('시작어를 선택하지 않았습니다.');
  }

  const targetLanguagePrompt = new MultiSelect({
    name: 'targetLanguage',
    message:
      '번역될 언어를 선택해주세요! 영어는 기본 번역입니다. (선택: space키, 결정: enter 키)',
    limit: LANGUAGE.length,
    choices: LANGUAGE.reduce((acc, cur) => {
      // 시작어와 영어는 번역 리스트에서 제외
      if (cur.value !== sourceLanguage && cur.value !== 'en') acc.push(cur);
      return acc;
    }, []),
    result(value) {
      return this.map(value);
    },
  });
  const targetLanguage = await targetLanguagePrompt.run();

  if (!Object.keys(targetLanguage).length) {
    console.log('번역 언어를 선택하지 않았습니다. 영문으로만 번역됩니다.');
  }
  return {
    targetDir,
    sourceLanguage,
    targetLanguage,
  };
  // ex : 436896220118, en, { 'Chinese (Simplified)': 'zh-CN', 'Chinese (Traditional)':'zh-TW', English: 'en' }
};
