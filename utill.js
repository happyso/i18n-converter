import fs from 'fs';
import flattenDeep from 'lodash.flattendeep';

export const getFiles = (dir, regex) => {
  const dirs = fs.readdirSync(dir);
  const filesArr = dirs.map((file) => {
    if (fs.statSync(`${dir}/${file}`).isDirectory()) {
      return getFiles(`${dir}/${file}`);
    }
    return `${dir}/${file}`;
  });
  if (regex) {
    return flattenDeep(filesArr).filter((v) => regex.test(v));
  }
  return flattenDeep(filesArr);
};

export const mkdir = (dirPath) => {
  const isExists = fs.existsSync(dirPath);
  if (!isExists) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

export const sleep = (ms) => {
  console.log(`--- ${ms}ms 딜레이 추가 ---`);
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const setDescendingJson = async (file) => {
  try {
    const localeObj = JSON.parse(file, null, 4);
    for (const property in localeObj) {
      const group = localeObj[property];
      localeObj[property] = Object.entries(group)
        .sort(([, a], [, b]) => b.length - a.length)
        .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
    }
    return await localeObj;
  } catch (error) {
    console.log(error);
  }
};

export const regexNonChar = (str) =>
  str
    .replace(/\{\$.*?\}/g, '') // 카페24 변수제거
    .replace(/\_\_(.*?)#(.*?)\_\_/g, '') // 코드화 제거
    .replace(/\s/g, '') // 공백 제거
    .replace(
      /[\{\}\[\]\/?.,;:|\)×*~`!^\-\–_…+<>ⓒ@©⚠▶｜★※\#$%&\\\=\(\'\"\“\”]/gi,
      '',
    ) // 특수기호 제거
    .replace(/^[0-9]+$/g, ''); // 숫자 제거

export const regexMessageId = (
  str, // 특수문자, 중복 여백, 숫자 제거
) =>
  str
    .replace(
      /[\{\}\[\]\/?.,;:|\)×*~`!^\-\–_…+<>ⓒ@©⚠▶｜★※\#$%&\\\=\(\'\"\“\”]/gi,
      '',
    )
    .replace(/[0-9]/gi, '')
    .replace(/\s\s/gi, ' ');
