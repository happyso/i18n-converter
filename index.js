import fs from 'fs';
import { JSDOM } from 'jsdom';
import { TranslationServiceClient } from '@google-cloud/translate';
import clean from './clean';
import { prompt, checkNewSkin } from './prompt';
import { getFiles, mkdir, regexNonChar, regexMessageId } from './utill';
import { API_KEY, SKIN_DIR, EN_JSON, LANGUAGE } from './const';
import initSubstitution from './substitution';

let skinDefaultPath = null;
let skinDirJiraPath = null;
let skinLocalePath = null;

const getDom = async (file) => {
  try {
    const options = {
      contentType: 'text/html;charset=UTF-8',
      includeNodeLocations: true,
    };

    const NOT_CHECK_TAGS = ['br', 'hr'];
    const codeRegex = /(\_\_)(.*)#(.*)(\_\_)/g;
    const dom = await JSDOM.fromFile(file, options);
    const { document } = dom.window;
    const els = document.querySelectorAll(
      `*${NOT_CHECK_TAGS.reduce((acc, tag) => `${acc}:not(${tag})`, '')}`,
    );

    const textArray = [];

    els.forEach((el) => {
      const hasTextNode =
        Array.from(el.childNodes).filter(
          (v) =>
            v.nodeType === 3 &&
            regexNonChar(v.textContent).replace(/\n/g, '') !== '',
        ).length > 0;

      if (el.nodeType === 1) {
        const attrArr = [];

        el.placeholder && regexNonChar(el.placeholder).length > 0
          ? attrArr.push(el.placeholder)
          : false;
        el.title && regexNonChar(el.title).length > 0
          ? attrArr.push(el.title)
          : false;
        el.alt && regexNonChar(el.alt).length > 0
          ? attrArr.push(el.alt)
          : false;

        if (attrArr.length > 0) {
          attrArr.forEach((attr) => {
            if (/\{\$.*?\}/g.test(attr)) {
              // 텍스트내 변수 텍스트(ex:{$test}) 체크
              const splitArr = attr.split(/\{\$.*?\}/);
              splitArr.forEach((item) => {
                if (regexNonChar(item).length > 0) textArray.push(item.trim());
              });
            } else {
              textArray.push(attr.trim());
            }
          });
        }
      }

      if (el.nodeName !== 'SCRIPT' && el.nodeName !== 'STYLE' && hasTextNode) {
        el.childNodes.forEach((child) => {
          if (
            child.nodeType === 3 &&
            regexNonChar(child.nodeValue) !== '' &&
            codeRegex.test(child.nodeValue) === false
          ) {
            // __{}#{}__구조로 이미 코드 삽입되어있을땐 패스
            const textReplace = child.nodeValue.replace(/\n\s+/g, ' ');
            if (/\{\$.*?\}/g.test(textReplace)) {
              const textArr = textReplace.split(/\{\$.*?\}/);
              textArr.forEach((text) => {
                if (regexNonChar(text).length > 0) textArray.push(text.trim());
              });
            } else {
              textArray.push(textReplace.trim());
            }
          }
        });
      }
    });
    return textArray;
  } catch (err) {
    console.error(err);
  }
};

const checkMessageId = (string) => {
  const result =
    regexMessageId(string).length > 0 ? regexMessageId(string) : 'unknown';
  return result;
};

const duplicationChecker = async (object) => {
  for (const value of Object.keys(object)) {
    const resultArr = object[value].reduce(
      (unique, item) => (unique.includes(item) ? unique : [...unique, item]),
      [],
    );
    object[value] = resultArr;
  }
  return object;
};

const initDom = async (dir, files) => {
  const skinTextObj = {};

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const fileName = file.replace(`${dir}/`, ''); // ex. test.html remove
    const dirName = fileName
      .substring(0, fileName.lastIndexOf('/'))
      .toUpperCase(); // ex. ORDER/EC_ORDERFORM/AGREEMENT
    const GroupId =
      dirName.replace(/\//g, '_').length > 0
        ? dirName.replace(/\//g, '_')
        : 'INDEX'; // ex. ORDER_EC_ORDERFORM_AGREEMENT
    const groupArr = await getDom(files[i], GroupId);

    if (skinTextObj[GroupId]) {
      const beforeValue = skinTextObj[GroupId];
      skinTextObj[GroupId] = beforeValue.concat(groupArr);
    } else {
      skinTextObj[GroupId] = groupArr;
    }
  }

  const resultSkinTextObj = duplicationChecker(skinTextObj); // 중복 텍스트 제거
  return resultSkinTextObj;
};

const createMessageId = (message) => {
  let num = 0;
  const messageReplace = checkMessageId(message).trim().split(' ');
  const messageIdArray = messageReplace
    .reduce((acc, cur) => {
      if (acc.length === 0) {
        acc.push(cur);
        num += cur.length;
      } else if (num + cur.length + 1 < 30) {
        acc.push(cur);
        num = num + cur.length + 1;
      }
      return acc;
    }, [])
    .join('_')
    .toUpperCase();
  return messageIdArray;
};

const getIdxString = (number) => {
  const maxLength = 3;
  const n = String(number); // 문자열 변환
  n.split('');
  const result =
    n.length >= maxLength
      ? n
      : new Array(maxLength - n.length + 1).join('0') + n; // 남는 길이만큼 0으로 채움
  return `_${result}`;
};

const createJson = (en, other) => {
  // 그룹아이디 별로 번역 리스트가 온다. en = 영어, other는 영어외 언어 type Array
  const numIndexObject = {};
  const english = {};
  const otherLang = {};

  const regex = /^[a-zA-Z0-9+]*$/;
  for (let i = 0; i < en.length; i += 1) {
    // en Translate
    const message = en[i];
    const messageID = createMessageId(message);

    if (regex.test(messageID.replace(/_/g, ''))) {
      if (Object.prototype.hasOwnProperty.call(numIndexObject, messageID)) {
        numIndexObject[messageID] = numIndexObject[messageID] + 1;
      } else {
        numIndexObject[messageID] = 0;
      }
      const resultKey =
        numIndexObject[messageID] === 0
          ? messageID
          : messageID + getIdxString(numIndexObject[messageID]);

      if (other) {
        otherLang[resultKey] = other[i];
      }
      english[resultKey] = en[i];
    } else {
      console.log(`"${message}" 시작어와 다른 언어 텍스트가 있습니다.`);
    }
  }

  if (other) {
    return {
      english,
      otherLang,
    };
  }
  return english;
};
const deleteEmptyValue = (obj) => {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && Object.keys(obj[key]).length === 0) {
      delete obj[key];
    }
  }
  return obj;
};

const jsonInit = async (skinObject, source, etcLang) => {
  // 스킨 텍스트 오브젝트, 스킨 폴더, 시작어
  // 시작어가 영어면 영어로만 json 생성
  mkdir(skinLocalePath);

  if (source === 'en') {
    const english = {};
    for (const value of Object.keys(skinObject)) {
      if (skinObject[value].length > 0) {
        english[value] = createJson(skinObject[value], false);
      }
    }

    const resultEn = deleteEmptyValue(english);
    const stringify = JSON.stringify(resultEn, null, 4);
    fs.writeFileSync(`${skinLocalePath}${EN_JSON}`, stringify, 'utf-8');
  } else {
    // 시작어가 영어가 아니면 영어로 번역 및 시작어와 영어 json생성
    const en = {};
    const other = {};

    for (const value of Object.keys(skinObject)) {
      if (skinObject[value].length > 0) {
        const translation = await initTranslate(
          skinObject[value],
          source,
          'en',
        );
        const { english, otherLang } = createJson(
          translation,
          skinObject[value],
        );
        en[value] = english;
        other[value] = otherLang;
      }
    }
    const resultEn = deleteEmptyValue(en);
    const resultOther = deleteEmptyValue(other);

    fs.writeFileSync(
      `${skinLocalePath}${EN_JSON}`,
      JSON.stringify(resultEn, null, 4),
      'utf-8',
    );

    fs.writeFileSync(
      `${skinLocalePath}/${etcLang}.json`,
      JSON.stringify(resultOther, null, 4),
      'utf-8',
    );
  }
};

const initTranslate = async (beforeText, source, target) => {
  const projectId = 'team-feplatform';
  const keyFilename = API_KEY;
  const location = 'global';

  const translationClient = new TranslationServiceClient({
    projectId,
    keyFilename,
  });
  // Construct request
  const request = {
    parent: `projects/${projectId}/locations/${location}`,
    contents: beforeText,
    mimeType: 'text/plain', // mime types: text/plain, text/html
    sourceLanguageCode: source,
    targetLanguageCode: target,
  };

  // Run request
  const [response] = await translationClient.translateText(request);
  const result = [];
  for (const translation of response.translations) {
    result.push(translation.translatedText);
  }
  return result;
};

const etcTranslate = async (path, lang, name) => {
  const data = fs.readFileSync(`${path}${EN_JSON}`, { encoding: 'utf8' });
  const localeObj = JSON.parse(data, null, 4); // en.json object
  const skinArray = []; // en object -> array
  for (const value of Object.keys(localeObj)) {
    skinArray.push(
      Object.keys(localeObj[value]).map(function (key) {
        return localeObj[value][key];
      }),
    );
  }

  console.log(`${lang}로 번역합니다.`);
  for (let i = 0; i < skinArray.length; i += 1) {
    // en Translate
    skinArray[i] = await initTranslate(skinArray[i], 'en', lang);
  }

  const merged = Object.keys(localeObj).reduce((acc, cur, i) => {
    // en array -> object
    acc[cur] = Object.keys(localeObj[cur]).reduce(
      (obj, key, index) => ({ ...obj, [key]: skinArray[i][index] }),
      {},
    );
    return acc;
  }, {});

  const stringify = JSON.stringify(merged, null, 4);
  fs.writeFileSync(`${path}/${name}.json`, stringify, 'utf-8');
};

const createTranslateJson = (arr, obj) => {
  arr.forEach((el) => {
    const resultJsonFlieName = Object.keys(obj).find((key) => obj[key] === el);
    etcTranslate(skinLocalePath, el, resultJsonFlieName);
  });
};

(() => {
  const build = async () => {
    // NOTE: default 폴더 만 있고, 빌드된 폴더가 없는 새로운 폴더 체크
    const choices = checkNewSkin();
    // NOTE: 스킨 디렉토리, 시작어, 번역어 리스트 확인
    const { targetDir, sourceLanguage, targetLanguage } = await prompt(choices);
    // NOTE: 선택된 스킨 디렉토리
    skinDirJiraPath = `${SKIN_DIR}/${targetDir}`;
    // NOTE: 선택된 스킨 디렉토리 내 default 폴더
    skinDefaultPath = `${skinDirJiraPath}/default`;

    let targetLangECcode = '';
    LANGUAGE.forEach((lang) => {
      const { value } = lang;
      const { name } = lang;
      if (value === sourceLanguage) {
        targetLangECcode = name;
      }
    });
    // NOTE: 선택된 스킨 디렉토리 내 default 폴더내 스킨 폴더 리스트
    const folderList = fs.readdirSync(skinDefaultPath);

    for await (const folder of folderList) {
      const dir = `${skinDefaultPath}/${folder}`;
      const skinFiles = getFiles(dir, /(.html)$/);
      skinLocalePath = `${skinDirJiraPath}/${folder}/locale`;

      if (!skinFiles.length) {
        console.log('[!] WARNING [!]');
        console.log('스킨 파일이 없습니다.');
      } else {
        console.log(`📑 ${dir} 텍스트 찾기 시작!`);
        const skinTextObject = await initDom(dir, skinFiles);

        // 텍스트 추출 확인용
        // mkdir(`${SKIN_DIR}/${targetDir}/default/${folder}/textJson/`);
        // fs.writeFileSync(`${SKIN_DIR}/${targetDir}/default/${folder}/textJson/${folder}.json`, JSON.stringify(skinTextObject, null, 4), 'utf-8');

        console.log(`📚 ${dir} json 제작 시작!`);
        await jsonInit(skinTextObject, sourceLanguage, targetLangECcode); // 영문 또는 시작어와 영문 json 생성

        console.log(`📚 ${dir} 스킨소스 코드화 시작!`);
        await initSubstitution(skinDirJiraPath, folder, targetLangECcode);

        console.log(`📚 ${dir} json 번역 시작!`);
        const selectedTranslateLanguage = Object.keys(targetLanguage).map(
          (key) => {
            return targetLanguage[key];
          },
        ); // 선택된 번역 언어 오브젝트를 배열로 변환
        if (selectedTranslateLanguage.length) {
          createTranslateJson(selectedTranslateLanguage, targetLanguage);
        }
      }
    }
  };

  build().catch((err) => {
    if (skinDirJiraPath) clean(skinDirJiraPath);
    if (!err.message) return;
    console.log(err.message);
    console.log('비정상 종료!');
  });
})();
