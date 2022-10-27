import path from 'path';
import fs from 'fs-extra';
import shell from 'shelljs';

const clean = (removePath) => {
  console.log('빌드 파일을 삭제합니다.');
  const files = fs.readdirSync(removePath);
  files.forEach((file) => {
    if (file === 'default') return;
    shell.rm('-rf', path.join(removePath, file));
  });
};
export default clean;
