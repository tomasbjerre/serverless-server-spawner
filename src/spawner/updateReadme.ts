import { Help, Command } from 'commander';
import fs from 'fs';

export function updateReadme(command: Command) {
  if (!process.env.UPDATE_README) {
    return;
  }
  const textToReplace = `<!-- Commander help //-->`;
  const fileToUpdate = `README.md`;
  const helpText = new Help().formatHelp(command, new Help());
  const fileToUpdateContent = fs.readFileSync(fileToUpdate, 'utf-8');
  let updatedFileContent = ``;
  let updateAreaFound = false;
  let updateCommentFound = false;
  for (let line of fileToUpdateContent.split(/\r?\n/)) {
    if (!updateAreaFound) {
      updatedFileContent += `${line}\n`;
    }
    if (line.trim() == textToReplace) {
      updateCommentFound = true;
    } else if (updateCommentFound && line.trim().startsWith('```')) {
      updateAreaFound = true;
      updateCommentFound = false;
      updatedFileContent += helpText + '```\n';
    } else if (updateAreaFound && line.trim() == '```') {
      updateAreaFound = false;
    }
  }
  fs.writeFileSync(fileToUpdate, updatedFileContent, 'utf-8');
}
