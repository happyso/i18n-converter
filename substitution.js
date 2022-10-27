import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import beautify from 'js-beautify';
import htmlParser from 'html-parser';
import { setDescendingJson, getFiles, mkdir, regexNonChar } from './utill';

const copyFiles = (files, json, skinDir, copyPath) => {
  for (let i = 0; i < files.length; i++) {
    // copyfile
    const file = files[i];
    const copyFile = path.basename(file);
    const copyfileDir = file.replace(copyPath, '').replace(copyFile, '');
    mkdir(skinDir + copyfileDir);
    fs.copyFileSync(file, skinDir + copyfileDir + copyFile);
  }
  const getCopyFiles = getFiles(skinDir, /(.html)$/); // html 외 파일 제외
  getGroupId(skinDir, getCopyFiles, json, copyPath); // output skin path, copy skin file, locale json
};

const getGroupId = async (skinDir, files, newLocaleObj, defaultPath) => {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = file.replace(`${skinDir}/`, '');
    const dirName = fileName
      .substring(0, fileName.lastIndexOf('/'))
      .toUpperCase(); // ex. ORDER/EC_ORDERFORM/AGREEMENT
    const GroupId =
      dirName.replace(/\//g, '_').length > 0
        ? dirName.replace(/\//g, '_')
        : 'INDEX'; // ex. ORDER_EC_ORDERFORM_AGREEMENT
    const hasGroupId = Object.prototype.hasOwnProperty.call(
      newLocaleObj,
      GroupId,
    ); // 그룹아이디 유무 체크

    // 짝이 맞지 않는 태그 안내용 default path
    const defaultFileDir = file.replace(skinDir, '').replace(fileName, '');
    const defaultFilePath = defaultPath + defaultFileDir + fileName;

    if (hasGroupId) {
      fs.readFile(file, 'utf-8', (err, data) => {
        const doctypeRegex = /doctype/gi;
        const bodyRegex = /\<\/body\>/g;
        const hasDoctype = doctypeRegex.test(data); // doctype 유무 체크
        const hasBody = bodyRegex.test(data); // body tag 유무 체크

        const resultData =
          !hasDoctype && !hasBody
            ? `<div id="ECconverterWrap">${data}</div>`
            : data;

        const tagCheck = unclosedTagFinder(resultData);
        if (!tagCheck.res) {
          console.log(
            `[🚨] 태그 짝이 맞지 않습니다. 파일을 확인해주세요 아래 파일은 코드화작업이 반영되지 않습니다. '\n' ${defaultFilePath} '\n' ${JSON.stringify(
              tagCheck.tags,
            )}`,
          );
        } else {
          getDom(
            file,
            resultData,
            GroupId,
            newLocaleObj[GroupId],
            hasDoctype,
            hasBody,
          ); // file 경로, file data, 그룹아이디(string), 그룹 object, doctype 유무
        }
        if (err) {
          console.log(err);
        }
      });
    }
  }
};

const unclosedTagFinder = (data) => {
  let number_of_starttags = 0;
  let number_of_endtags = 0;
  let hasDoc = false;
  const tags = {};
  htmlParser.parse(data, {
    docType: (value) => {
      if (value) {
        hasDoc = true;
      }
    },
    openElement: (name) => {
      if (
        !(
          hasDoc ||
          /(area|base|br|hr|col|command|embed|img|input|keygen|link|meta|param|source|track|wbr|path|circle)/g.test(
            name,
          )
        )
      ) {
        if (!tags[name]) tags[name] = 1;
        else tags[name] += 1;
        number_of_starttags += 1;
      }
    },
    closeElement: (name) => {
      if (
        !(
          hasDoc ||
          /(area|base|br|hr|col|command|embed|img|input|keygen|link|meta|param|source|track|wbr|path|circle)/g.test(
            name,
          )
        )
      ) {
        if (!tags[name]) tags[name] = -1;
        else tags[name] -= 1;
        number_of_endtags += 1;
      }
    },
  });
  if (number_of_starttags !== number_of_endtags) {
    return {
      res: false,
      tags: Object.keys(tags).reduce((acc, tag) => {
        if (!tags[tag]) return acc;
        return {
          ...acc,
          [tag]: tags[tag],
        };
      }, {}),
    };
  }
  return { res: true, tags };
};

const findText = (text, groupId, groupObj) => {
  const keys = Object.keys(groupObj);
  let resultText = text;

  RegExp.quote = (str) => {
    return str.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
  };

  for (let i = 0; i < keys.length; i++) {
    const messageId = keys[i];
    const messageValue = groupObj[messageId]; // 메세지 키 값
    const regex = new RegExp(RegExp.quote(messageValue), 'g');
    if (regexNonChar(resultText).length > 0) {
      if (/\{\$.*?\}/g.test(resultText)) {
        const textArr = resultText.split(/([{}])/);
        textArr.forEach((text, index) => {
          if (
            !(/\$.*/g.test(text) || /[{}]/g.test(text)) &&
            text.match(regex)
          ) {
            textArr[index] = text.replace(regex, `__${messageId}#${groupId}__`);
          }
        });
        resultText = textArr.join('');
      } else if (resultText.match(regex)) {
        resultText = resultText.replace(regex, `__${messageId}#${groupId}__`);
      }
    } else {
      break;
    }
  }
  return resultText;
};

const getDom = async (file, data, groupId, groupObj, hasDoctype, hasBody) => {
  const options = {
    contentType: 'text/html',
    includeNodeLocations: true,
  };
  const beautifyOptions = {
    space_in_empty_paren: true,
    extra_liners: [],
  };
  const NOT_CHECK_TAGS = ['br', 'hr'];
  const deleteRegex = /(\{\$).*(\}="")/g;
  const codeRegex = /(\_\_)(.*)#(.*)(\_\_)/g;

  const dom = new JSDOM(data, options);
  const { document } = dom.window;
  const els = document.querySelectorAll(
    `*${NOT_CHECK_TAGS.reduce((acc, tag) => `${acc}:not(${tag})`, '')}`,
  );

  els.forEach((el) => {
    const hasTextNode =
      Array.from(el.childNodes).filter(
        (v) =>
          v.nodeType === 3 &&
          regexNonChar(v.textContent).replace(/\n/g, '') !== '',
      ).length > 0;

    if (
      el.nodeType === 1 &&
      el.placeholder &&
      regexNonChar(el.placeholder).length > 0
    ) {
      el.placeholder = findText(el.placeholder, groupId, groupObj);
    }
    if (el.nodeType === 1 && el.title && regexNonChar(el.title).length > 0) {
      el.title = findText(el.title, groupId, groupObj);
    }
    if (el.nodeType === 1 && el.alt && regexNonChar(el.alt).length > 0) {
      el.alt = findText(el.alt, groupId, groupObj);
    }
    if (el.nodeName !== 'SCRIPT' && el.nodeName !== 'STYLE' && hasTextNode) {
      el.childNodes.forEach((child) => {
        if (
          child.nodeType === 3 &&
          regexNonChar(child.nodeValue) !== '' &&
          codeRegex.test(child.nodeValue) === false
        ) {
          // __{}#{}__구조로 이미 코드 삽입되어있을땐 패스
          const nodeText = child.nodeValue.replace(/\n\s+/g, ' ').trim();
          child.nodeValue = findText(nodeText, groupId, groupObj);
        }
      });
    }
  });

  let html = null;

  if (hasDoctype) {
    html = `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
  } else if (hasBody) {
    html = document.body.outerHTML;
  } else {
    html = document.querySelector('#ECconverterWrap').innerHTML;
  }

  let resultHtml = beautify.html(html, beautifyOptions);

  if (deleteRegex.test(resultHtml)) {
    resultHtml = resultHtml.replace(/\}\=\"\"/g, '}'); // {$color_image}="" 와같이 솔루션 변수에 =""붙는 이슈 텍스트 제거
  }
  fs.writeFile(file, resultHtml, (error) => {
    if (error) throw error;
  });
};

const initSubstitution = async (skinPath, folder, tagetLang) => {
  try {
    const localeJson = fs.readFileSync(
      `${skinPath}/${folder}/locale/${tagetLang}.json`,
    );
    const skinFiles = getFiles(`${skinPath}/default/${folder}`);

    if (!localeJson.length) {
      console.log('[!] WARNING [!]');
      console.log('json 파일이 없습니다.');
    }
    if (!skinFiles.length) {
      console.log('[!] WARNING [!]');
      console.log('스킨 파일이 없습니다.');
    }
    const json = await setDescendingJson(localeJson);
    copyFiles(
      skinFiles,
      json,
      `${skinPath}/${folder}`,
      `${skinPath}/default/${folder}`,
    );
  } catch (err) {
    console.error(err);
  }
};

export default initSubstitution;
